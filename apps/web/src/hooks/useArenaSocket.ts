import { useState, useEffect, useRef, useCallback } from 'react'
import type { Question, GameSettings } from '../types'

export interface RoomPlayer {
  id: string
  socketId: string
  name: string
  isHost: boolean
  isReady: boolean
  score: number
  streak: number
  hasAnsweredCurrentRound: boolean
  avatarUrl?: string
}

export interface AnswerResult {
  playerId: string
  playerName: string
  isCorrect: boolean
  pointsAwarded: number
  streak: number
}

export function useArenaSocket(arenaId: string | undefined, initialSettings?: Partial<GameSettings>) {
  const [connected, setConnected] = useState(false)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [settings, setSettings] = useState<Partial<GameSettings>>(initialSettings || {})
  const [isHost, setIsHost] = useState(false)
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'reveal' | 'results'>('lobby')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [latestAnswerResult, setLatestAnswerResult] = useState<AnswerResult | null>(null)

  const socketRef = useRef<WebSocket | null>(null)

  const [revealEvent, setRevealEvent] = useState<{ timestamp: number; answer: string } | null>(null)
  const [arenaDeleted, setArenaDeleted] = useState(false)

  useEffect(() => {
    if (!arenaId) return

    // Get user info from localStorage if available
    let userId = ''
    let username = 'Joueur Anonyme'
    let avatarUrl: string | undefined

    const userStr = localStorage.getItem('auth_user')
    if (userStr) {
      try {
        const u = JSON.parse(userStr)
        if (u.id) userId = String(u.id)
        if (u.username) username = u.username
        if (u.avatarUrl) avatarUrl = u.avatarUrl
      } catch (e) {}
    } else {
      let savedId = sessionStorage.getItem('guest_user_id') || localStorage.getItem('guest_user_id')
      if (!savedId) {
        savedId = `guest_${Math.random().toString(36).substring(2, 7)}`
        sessionStorage.setItem('guest_user_id', savedId)
      }
      userId = savedId

      let savedName = sessionStorage.getItem('guest_username') || localStorage.getItem('guest_username')
      if (!savedName) {
        savedName = `Joueur_${Math.floor(100 + Math.random() * 900)}`
        sessionStorage.setItem('guest_username', savedName)
      }
      username = savedName
    }

    // Determine WS URL:
    // - Si VITE_WS_URL est explicitement défini (ex: wss://tunnel/ws), on l'utilise
    // - Sinon, on utilise dynamiquement le protocole et l'hôte courants
    const wsUrl = import.meta.env.VITE_WS_URL
      ? (import.meta.env.VITE_WS_URL.endsWith('/ws') ? import.meta.env.VITE_WS_URL : `${import.meta.env.VITE_WS_URL}/ws`)
      : (() => {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          return `${protocol}//${window.location.host}/ws`
        })()

    console.log(`[Arena WS] Connexion → ${wsUrl} (arène: ${arenaId}, joueur: ${username}, id: ${userId})`)

    let isUnmounted = false
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (isUnmounted) return

      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 10000)

      ws.onopen = () => {
        console.log(`[Arena WS] Connecté avec succès au serveur`)
        setConnected(true)
        // Send join event
        ws.send(JSON.stringify({
          type: 'join',
          arenaId,
          payload: {
            id: userId,
            name: username,
            avatarUrl,
            settings: initialSettings,
          },
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const { type } = data

          if (type === 'room_state') {
            if (data.players) {
              setPlayers(data.players)
              const self = (data.players as RoomPlayer[]).find(p => p.id === userId || p.name === username)
              if (self) {
                setIsHost(self.isHost)
              }
            }
            if (data.settings) setSettings(data.settings)
            if (data.phase) setPhase(data.phase)
            if (typeof data.currentRound === 'number') setCurrentRound(data.currentRound)
            if (data.questions && data.questions.length > 0) setQuestions(data.questions)
          }

          else if (type === 'settings_updated') {
            if (data.settings) setSettings(data.settings)
          }

          else if (type === 'game_started') {
            console.log(`[Arena WS] Signal "game_started" reçu !`)
            if (data.questions) setQuestions(data.questions)
            if (data.settings) setSettings(data.settings)
            if (data.players) setPlayers(data.players)
            setPhase('playing')
            setCurrentRound(0)
            setLatestAnswerResult(null)
            setRevealEvent(null)
          }

          else if (type === 'answer_result') {
            if (data.players) setPlayers(data.players)
            setLatestAnswerResult({
              playerId: data.playerId,
              playerName: data.playerName,
              isCorrect: data.isCorrect,
              pointsAwarded: data.pointsAwarded,
              streak: data.streak,
            })
          }

          else if (type === 'start_reveal') {
            if (data.players) setPlayers(data.players)
            setRevealEvent({ timestamp: Date.now(), answer: data.answer || '' })
          }

          else if (type === 'next_round') {
            if (typeof data.currentRound === 'number') setCurrentRound(data.currentRound)
            if (data.players) setPlayers(data.players)
            setLatestAnswerResult(null)
            setRevealEvent(null)
          }

          else if (type === 'arena_deleted') {
            setArenaDeleted(true)
          }
        } catch (err) {
          console.error('[Arena WS] Erreur lors du traitement du message:', err)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        clearInterval(pingInterval)
        if (!isUnmounted) {
          console.log('[Arena WS] Déconnecté — tentative de reconnexion dans 2s...')
          reconnectTimeout = setTimeout(connect, 2000)
        }
      }

      ws.onerror = (err) => {
        console.warn('[Arena WS] Erreur WebSocket:', err)
      }
    }

    connect()

    return () => {
      isUnmounted = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [arenaId])

  const toggleReady = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'toggle_ready', arenaId }))
    }
  }, [arenaId])

  const updateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'update_settings', arenaId, payload: newSettings }))
    }
  }, [arenaId])

  const startGame = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'start_game', arenaId }))
    }
  }, [arenaId])

  const submitAnswer = useCallback((answer: string, currentScore?: number) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'submit_answer', arenaId, payload: { answer, score: currentScore } }))
    }
  }, [arenaId])

  const triggerReveal = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'trigger_reveal', arenaId }))
    }
  }, [arenaId])

  const nextRound = useCallback(() => {
    setRevealEvent(null)
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'next_round', arenaId }))
    }
  }, [arenaId])

  const deleteArena = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'delete_arena', arenaId }))
    }
  }, [arenaId])

  const returnToLobby = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'return_to_lobby', arenaId }))
    }
  }, [arenaId])

  return {
    connected,
    players,
    settings,
    isHost,
    phase,
    questions,
    currentRound,
    latestAnswerResult,
    revealEvent,
    arenaDeleted,
    toggleReady,
    updateSettings,
    startGame,
    submitAnswer,
    triggerReveal,
    nextRound,
    deleteArena,
    returnToLobby,
  }
}
