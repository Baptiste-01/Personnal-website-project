import Elysia from 'elysia'
import prisma from '../lib/prisma'
import { roomManager, type GameSettings } from '../ws/roomManager'

interface WsData {
  params: { arenaId: string }
  query?: { playerId?: string; playerName?: string }
  playerId?: string
  playerName?: string
}

export const arenaWs = new Elysia()
  .ws('/ws/arena/:arenaId', {
    open(ws) {
      const data = ws.data as WsData
      const arenaId = data.params.arenaId
      if (!arenaId) return

      if (data.query?.playerId) {
        data.playerId = data.query.playerId
      }
      if (data.query?.playerName) {
        data.playerName = data.query.playerName
      }

      // Pre-warm room immediately in memory
      const room = roomManager.getOrCreate(arenaId, 'Arène')

      // Non-blocking metadata enrichment from DB
      prisma.arena
        .findUnique({ where: { id: arenaId } })
        .then(arena => {
          if (arena) {
            room.name = arena.name
            if (arena.maxPlayers) {
              room.settings.maxPlayers = arena.maxPlayers
            }
          }
        })
        .catch(() => {})
    },

    async message(ws, raw) {
      const data = ws.data as WsData
      const arenaId = data.params.arenaId
      if (!arenaId) return

      let msg: any
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch {
        return
      }

      if (!msg || typeof msg !== 'object') return

      const room = roomManager.getOrCreate(arenaId)

      switch (msg.type) {
        case 'join': {
          const playerId = String(msg.playerId || data.playerId || data.query?.playerId || `p_${Math.random().toString(36).slice(2, 9)}`)
          const playerName = String(msg.playerName || data.playerName || data.query?.playerName || 'Anonyme')

          data.playerId = playerId
          data.playerName = playerName

          // Optional initial settings injection if host creates with parameters
          if (msg.settings && typeof msg.settings === 'object' && room.players.size === 0) {
            room.settings = {
              ...room.settings,
              ...(msg.settings as Partial<GameSettings>),
            }
          }

          const player = room.addOrUpdatePlayer(playerId, playerName, ws)

          // Send current state to newly joined player
          ws.send(
            JSON.stringify({
              type: 'room_state',
              selfId: playerId,
              isHost: player.isHost,
              room: room.getState(),
            })
          )

          // If game is active, immediately deliver the current question so player is never stuck
          if (room.status === 'playing' || room.status === 'reveal') {
            const q = room.getCurrentQuestion()
            if (q) {
              ws.send(
                JSON.stringify({
                  type: 'new_round',
                  round: room.currentRoundIndex,
                  totalRounds: room.settings.infiniteRounds ? 0 : room.settings.roundCount,
                  isInfinite: room.settings.infiniteRounds,
                  timePerRound: room.settings.timePerRound,
                  question: room.getPublicQuestion(q),
                  players: room.getPlayerSummaries(),
                })
              )
            }
          }

          // Broadcast to everyone else
          room.broadcast(
            {
              type: 'player_joined',
              player: {
                id: player.id,
                name: player.name,
                isHost: player.isHost,
                isReady: player.isReady,
                score: player.score,
                streak: player.streak,
                bestStreak: player.bestStreak,
                hasAnswered: player.hasAnswered,
                answeredCorrectly: player.answeredCorrectly,
                answerTime: player.answerTime,
              },
              players: room.getPlayerSummaries(),
            },
            playerId
          )

          // Sync active player count to DB
          prisma.arena
            .update({
              where: { id: arenaId },
              data: { players: room.getActivePlayerCount() },
            })
            .catch(() => {})

          break
        }

        case 'leave': {
          let playerId = String(msg.playerId || data.playerId || data.query?.playerId || '')
          if (!playerId) {
            for (const [id, p] of room.players.entries()) {
              if (p.ws === ws || (ws.raw && p.ws?.raw === ws.raw)) {
                playerId = id
                break
              }
            }
          }
          if (!playerId) return

          room.removePlayer(playerId)

          const activeCount = room.getActivePlayerCount()
          prisma.arena
            .update({
              where: { id: arenaId },
              data: {
                players: activeCount,
                ...(activeCount === 0 ? { status: 'waiting' } : {}),
              },
            })
            .catch(() => {})
          break
        }

        case 'toggle_ready': {
          const playerId = data.playerId
          if (!playerId) return
          const player = room.players.get(playerId)
          if (!player) return

          player.isReady = typeof msg.isReady === 'boolean' ? msg.isReady : !player.isReady

          room.broadcast({
            type: 'player_ready',
            playerId,
            isReady: player.isReady,
            players: room.getPlayerSummaries(),
          })
          break
        }

        case 'update_settings': {
          const playerId = data.playerId
          if (!playerId) return
          const player = room.players.get(playerId)
          if (!player || !player.isHost) return

          if (msg.settings && typeof msg.settings === 'object') {
            room.updateSettings(msg.settings as Partial<GameSettings>)
          }
          break
        }

        case 'start_game': {
          const playerId = data.playerId
          if (!playerId) return
          const player = room.players.get(playerId)
          if (!player || !player.isHost) return

          if (msg.settings && typeof msg.settings === 'object') {
            room.settings = {
              ...room.settings,
              ...(msg.settings as Partial<GameSettings>),
            }
          }

          const started = await room.startGame()

          // Update arena status to 'playing' in DB only if game actually started
          if (started) {
            prisma.arena
              .update({
                where: { id: arenaId },
                data: { status: 'playing' },
              })
              .catch(() => {})
          }

          break
        }

        case 'submit_answer': {
          const playerId = data.playerId
          if (!playerId || typeof msg.answer !== 'string') return
          room.submitAnswer(playerId, msg.answer)
          break
        }

        case 'restart_game': {
          const playerId = data.playerId
          if (!playerId) return
          const player = room.players.get(playerId)
          if (!player || !player.isHost) return

          room.resetToLobby()

          prisma.arena
            .update({
              where: { id: arenaId },
              data: { status: 'waiting' },
            })
            .catch(() => {})

          break
        }

        case 'request_current_round': {
          if (room.status === 'playing' || room.status === 'reveal') {
            const q = room.getCurrentQuestion()
            if (q) {
              ws.send(
                JSON.stringify({
                  type: 'new_round',
                  round: room.currentRoundIndex,
                  totalRounds: room.settings.infiniteRounds ? 0 : room.settings.roundCount,
                  isInfinite: room.settings.infiniteRounds,
                  timePerRound: room.settings.timePerRound,
                  question: room.getPublicQuestion(q),
                  players: room.getPlayerSummaries(),
                })
              )
            }
          }
          break
        }

        case 'chat_message': {
          const playerId = data.playerId
          if (!playerId) return
          const player = room.players.get(playerId)
          if (!player) return

          const text = String(msg.text || '').trim().slice(0, 150)
          if (!text) return

          room.broadcast({
            type: 'chat_message',
            id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            playerId: player.id,
            playerName: player.name,
            text,
            timestamp: Date.now(),
          })
          break
        }
      }
    },

    close(ws) {
      const data = ws.data as WsData
      const arenaId = data.params.arenaId
      let playerId = data.playerId || data.query?.playerId

      if (!arenaId) return

      const room = roomManager.get(arenaId)
      if (!room) return

      if (!playerId) {
        for (const [id, p] of room.players.entries()) {
          if (p.ws === ws || (ws.raw && p.ws?.raw === ws.raw)) {
            playerId = id
            break
          }
        }
      }

      if (!playerId) return

      // Graceful disconnect (does not destroy the room instantly on route transitions)
      room.handlePlayerDisconnect(playerId)

      // Sync active player count to DB
      const activeCount = room.getActivePlayerCount()
      prisma.arena
        .update({
          where: { id: arenaId },
          data: {
            players: activeCount,
            ...(activeCount === 0 ? { status: 'waiting' } : {}),
          },
        })
        .catch(() => {})
    },
  })
