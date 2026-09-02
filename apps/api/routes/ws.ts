import Elysia from 'elysia'
import { roomManager, type QuestionItem } from '../lib/roomManager'
import prisma from '../lib/prisma'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export const wsRoute = new Elysia().ws('/ws', {
  open(ws) {
    console.log(`[WS Server] Connexion ouverte: ${ws.id}`)
  },
  async message(ws, message: any) {
    const data = typeof message === 'string' ? JSON.parse(message) : message
    const { type, arenaId: rootArenaId, payload } = data
    const targetArenaId = rootArenaId || payload?.arenaId || (ws.data as any)?.arenaId

    if (type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }))
      return
    }

    if (!targetArenaId) {
      console.warn(`[WS Server] Message reçu sans arenaId:`, type, data)
      return
    }

    // Assure le stockage sur ws.data et l'abonnement
    if (targetArenaId) {
      ;(ws.data as any).arenaId = targetArenaId
      ws.subscribe(`arena_${targetArenaId}`)
    }

    if (type === 'join') {
      const { id, name, avatarUrl, settings } = payload || {}
      const room = roomManager.getOrCreateRoom(targetArenaId, settings)
      const player = roomManager.addPlayer(targetArenaId, ws.id, {
        id: id || `guest_${Math.random().toString(36).substring(2, 7)}`,
        name: name || 'Joueur Anonyme',
        avatarUrl,
      })

      console.log(`[WS Server] Joueur "${player.name}" (${player.id}) a rejoint l'arène ${targetArenaId}`)

      const playersList = roomManager.getPlayersList(room)

      // Broadcast updated room state to all players in the arena
      const broadcastMsg = JSON.stringify({
        type: 'room_state',
        arenaId: targetArenaId,
        players: playersList,
        settings: room.settings,
        phase: room.phase,
        currentRound: room.currentRound,
        questions: room.questions,
      })

      ws.publish(`arena_${targetArenaId}`, broadcastMsg)
      ws.send(broadcastMsg)
    }

    else if (type === 'toggle_ready') {
      const result = roomManager.toggleReady(ws.id)
      if (result) {
        const { room } = result
        const playersList = roomManager.getPlayersList(room)
        const msg = JSON.stringify({
          type: 'room_state',
          arenaId: targetArenaId,
          players: playersList,
          settings: room.settings,
          phase: room.phase,
        })
        ws.publish(`arena_${targetArenaId}`, msg)
        ws.send(msg)
      }
    }

    else if (type === 'update_settings') {
      const room = roomManager.updateSettings(targetArenaId, ws.id, payload)
      if (room) {
        const msg = JSON.stringify({
          type: 'settings_updated',
          arenaId: targetArenaId,
          settings: room.settings,
        })
        ws.publish(`arena_${targetArenaId}`, msg)
        ws.send(msg)
      }
    }

    else if (type === 'start_game') {
      const room = roomManager.getRoom(targetArenaId)
      if (!room) {
        console.warn(`[WS Server] start_game: Salle ${targetArenaId} introuvable`)
        return
      }

      const caller = room.players.get(ws.id)
      if (!caller || !caller.isHost) {
        console.warn(`[WS Server] start_game refusé: appelant non hôte ou introuvable`, ws.id)
        return
      }

      const categories = room.settings.categories
      const count = room.settings.infiniteRounds ? 50 : room.settings.roundCount

      let dbQuestions: any[] = []
      try {
        dbQuestions = await prisma.question.findMany({
          where: {
            category: { in: categories },
          },
          take: count * 2,
        })
      } catch (err) {
        console.warn('Prisma query error in start_game, using fallback questions:', err)
      }

      // Fallback questions if database is empty
      let formattedQuestions: QuestionItem[] = []

      if (dbQuestions.length > 0) {
        const shuffled = dbQuestions.sort(() => 0.5 - Math.random()).slice(0, count)
        formattedQuestions = shuffled.map(q => ({
          id: q.id,
          text: q.text,
          answer: q.answer,
          acceptedAnswers: Array.isArray(q.acceptedAnswers)
            ? (q.acceptedAnswers as string[])
            : [q.answer],
          hint: q.hint || '',
          imageUrl: q.imageUrl,
          category: q.category,
          difficulty: q.difficulty,
        }))
      } else {
        formattedQuestions = [
          { id: 1, text: 'Quel est ce célèbre monument de Paris ?', answer: 'Tour Eiffel', acceptedAnswers: ['tour eiffel', 'eiffel', 'la tour eiffel'], hint: 'Conçue par Gustave Eiffel', category: 'geographie', difficulty: 'facile' },
          { id: 2, text: 'Quelle est la capitale de la France ?', answer: 'Paris', acceptedAnswers: ['paris'], hint: 'Ville lumière', category: 'geographie', difficulty: 'facile' },
          { id: 3, text: 'Qui a peint la Joconde ?', answer: 'Leonard de Vinci', acceptedAnswers: ['leonard de vinci', 'de vinci', 'vinci', 'da vinci'], hint: 'Artiste de la Renaissance', category: 'histoire', difficulty: 'facile' },
          { id: 4, text: 'Quel est le symbole chimique de l\'eau ?', answer: 'H2O', acceptedAnswers: ['h2o'], hint: 'Deux éléments', category: 'sciences', difficulty: 'facile' },
        ]
      }

      room.questions = formattedQuestions
      room.phase = 'playing'
      room.currentRound = 0
      room.firstAnswerTimestamp = null
      room.roundStartTime = Date.now()

      for (const p of room.players.values()) {
        p.score = 0
        p.streak = 0
        p.hasAnsweredCurrentRound = false
      }

      console.log(`[WS Server] Partie lancée pour l'arène ${targetArenaId} avec ${room.players.size} joueurs`)

      const msg = JSON.stringify({
        type: 'game_started',
        arenaId: targetArenaId,
        questions: formattedQuestions,
        settings: room.settings,
        players: roomManager.getPlayersList(room),
      })
      ws.publish(`arena_${targetArenaId}`, msg)
      ws.send(msg)
    }

    else if (type === 'submit_answer') {
      const room = roomManager.getRoom(targetArenaId)
      if (!room || room.phase !== 'playing') return

      const player = room.players.get(ws.id)
      if (!player || player.hasAnsweredCurrentRound) return

      const currentQ = room.questions[room.currentRound]
      if (!currentQ) return

      const rawAnswer = payload?.answer || ''
      const normalizedUser = normalize(rawAnswer)
      const normalizedAns = normalize(currentQ.answer)
      const normalizedAccepted = (currentQ.acceptedAnswers || []).map(normalize)

      const isCorrect = normalizedUser === normalizedAns || normalizedAccepted.includes(normalizedUser)

      let pointsAwarded = 0
      if (isCorrect) {
        player.hasAnsweredCurrentRound = true
        const now = Date.now()

        if (!room.firstAnswerTimestamp) {
          room.firstAnswerTimestamp = now
          pointsAwarded = room.settings.pointsPerAnswer
        } else {
          const delayMs = now - room.firstAnswerTimestamp
          const totalRoundTimeMs = room.settings.timePerRound * 1000
          const minPts = Math.max(1, Math.round(room.settings.pointsPerAnswer * 0.1))
          const timeRatio = Math.min(1, delayMs / totalRoundTimeMs)
          pointsAwarded = Math.round(
            room.settings.pointsPerAnswer - (room.settings.pointsPerAnswer - minPts) * timeRatio
          )
        }

        player.streak += 1
        const streakMultiplier = player.streak >= 5 ? 2.0 : player.streak >= 3 ? 1.5 : 1.0
        pointsAwarded = Math.round(pointsAwarded * streakMultiplier)
        
        if (typeof payload?.score === 'number' && payload.score > 0) {
          player.score = payload.score
        } else {
          player.score += pointsAwarded
        }
      } else {
        if (typeof payload?.score === 'number' && payload.score > 0) {
          player.score = payload.score
        }
        player.streak = 0
      }

      // Check if all players in room have answered
      const allAnswered = Array.from(room.players.values()).every(p => p.hasAnsweredCurrentRound)

      const playersList = roomManager.getPlayersList(room)
      const msg = JSON.stringify({
        type: 'answer_result',
        arenaId: targetArenaId,
        playerId: player.id,
        playerName: player.name,
        isCorrect,
        pointsAwarded,
        streak: player.streak,
        allAnswered,
        players: playersList,
      })
      ws.publish(`arena_${targetArenaId}`, msg)
      ws.send(msg)

      if (allAnswered) {
        const revealMsg = JSON.stringify({
          type: 'start_reveal',
          arenaId: targetArenaId,
          answer: currentQ.answer,
          players: playersList,
        })
        ws.publish(`arena_${targetArenaId}`, revealMsg)
        ws.send(revealMsg)
      }
    }

    else if (type === 'trigger_reveal') {
      const room = roomManager.getRoom(targetArenaId)
      if (!room) return

      const currentQ = room.questions[room.currentRound]
      const playersList = roomManager.getPlayersList(room)

      for (const p of room.players.values()) {
        p.hasAnsweredCurrentRound = true
      }

      const revealMsg = JSON.stringify({
        type: 'start_reveal',
        arenaId: targetArenaId,
        answer: currentQ?.answer || '',
        players: playersList,
      })
      ws.publish(`arena_${targetArenaId}`, revealMsg)
      ws.send(revealMsg)
    }

    else if (type === 'next_round') {
      const room = roomManager.getRoom(targetArenaId)
      if (!room) return

      const caller = room.players.get(ws.id)
      const allAnswered = Array.from(room.players.values()).every(p => p.hasAnsweredCurrentRound)
      // Only reject if caller is known to be non-host AND not all answered in a multi-player room
      if (caller && !caller.isHost && !allAnswered && room.players.size > 1) {
        return
      }

      room.currentRound += 1
      room.firstAnswerTimestamp = null
      room.roundStartTime = Date.now()

      for (const p of room.players.values()) {
        p.hasAnsweredCurrentRound = false
      }

      const msg = JSON.stringify({
        type: 'next_round',
        arenaId: targetArenaId,
        currentRound: room.currentRound,
        players: roomManager.getPlayersList(room),
      })
      ws.publish(`arena_${targetArenaId}`, msg)
      ws.send(msg)
    }

    else if (type === 'delete_arena') {
      const room = roomManager.getRoom(targetArenaId)
      if (!room) return

      const caller = room.players.get(ws.id)
      if (caller && caller.isHost) {
        roomManager.deleteRoom(targetArenaId)
        try {
          await prisma.arena.delete({ where: { id: targetArenaId } })
        } catch {}

        const msg = JSON.stringify({
          type: 'arena_deleted',
          arenaId: targetArenaId,
          reason: 'L\'hôte a supprimé l\'arène.',
        })
        ws.publish(`arena_${targetArenaId}`, msg)
        ws.send(msg)
      }
    }
  },

  close(ws) {
    console.log(`[WS Server] Connexion fermée: ${ws.id}`)
    const { room, removedPlayer } = roomManager.removePlayer(ws.id)
    if (room && removedPlayer) {
      const arenaId = room.id
      const playersList = roomManager.getPlayersList(room)
      if (playersList.length > 0) {
        const msg = JSON.stringify({
          type: 'room_state',
          arenaId,
          players: playersList,
          settings: room.settings,
          phase: room.phase,
        })
        ws.publish(`arena_${arenaId}`, msg)
      }
    }
  },
})
