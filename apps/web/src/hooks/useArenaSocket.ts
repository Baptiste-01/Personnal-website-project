import { useState, useEffect, useRef, useCallback } from 'react'
import type { PlayerSummary, Question, GameSettings, ChatMessage } from '../types'
import { soundManager } from '../utils/sound'
import { triggerVictoryConfetti, triggerStreakConfetti } from '../utils/confetti'
import { WS_URL } from '../utils/config'

export function getLocalPlayer(): { id: string; name: string } {
  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) {
      const u = JSON.parse(raw)
      const name = u.displayName || u.username || 'Vous'
      const id = u.id || `user_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
      return { id, name }
    }
  } catch {}

  let anonId = sessionStorage.getItem('sp_anon_id')
  if (!anonId) {
    anonId = `guest_${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem('sp_anon_id', anonId)
  }

  let anonName = sessionStorage.getItem('sp_anon_name')
  if (!anonName) {
    anonName = `Joueur ${Math.floor(100 + Math.random() * 900)}`
    sessionStorage.setItem('sp_anon_name', anonName)
  }

  return { id: anonId, name: anonName }
}

export type RoomStatus = 'waiting' | 'starting' | 'playing' | 'reveal' | 'finished'

export interface UseArenaSocketOptions {
  arenaId?: string
  initialSettings?: Partial<GameSettings>
  onGameStarted?: () => void
  onGameRestarted?: () => void
}

export function useArenaSocket({
  arenaId,
  initialSettings,
  onGameStarted,
  onGameRestarted,
}: UseArenaSocketOptions) {
  const [connected, setConnected] = useState(false)
  const [selfId, setSelfId] = useState<string>(() => getLocalPlayer().id)
  const [selfName, setSelfName] = useState<string>(() => getLocalPlayer().name)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<PlayerSummary[]>([])
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('waiting')
  const [settings, setSettings] = useState<GameSettings | null>(null)

  // Game state
  const [currentRound, setCurrentRound] = useState(0)
  const [totalRounds, setTotalRounds] = useState(10)
  const [isInfinite, setIsInfinite] = useState(false)
  const [timeLeft, setTimeLeft] = useState(20)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null)
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>([])
  const [answerFeedback, setAnswerFeedback] = useState<'none' | 'correct' | 'wrong'>('none')
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0)
  const [leaderboard, setLeaderboard] = useState<PlayerSummary[]>([])
  const [podium, setPodium] = useState<PlayerSummary[]>([])
  const [winner, setWinner] = useState<PlayerSummary | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<any>(null)
  const onGameStartedRef = useRef(onGameStarted)
  const onGameRestartedRef = useRef(onGameRestarted)

  useEffect(() => {
    onGameStartedRef.current = onGameStarted
    onGameRestartedRef.current = onGameRestarted
  }, [onGameStarted, onGameRestarted])

  // Connect to Elysia WebSocket
  useEffect(() => {
    if (!arenaId) return

    let isUnmounted = false
    const player = getLocalPlayer()
    setSelfId(player.id)
    setSelfName(player.name)

    const wsUrl = `${WS_URL}/ws/arena/${arenaId}?playerId=${encodeURIComponent(player.id)}&playerName=${encodeURIComponent(player.name)}`

    function connect() {
      if (isUnmounted) return

      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        if (isUnmounted) {
          ws.close()
          return
        }
        setConnected(true)

        // Send join payload
        const joinMsg = {
          type: 'join',
          playerId: player.id,
          playerName: player.name,
          settings: initialSettings,
        }
        ws.send(JSON.stringify(joinMsg))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        } catch {
          // ignore invalid messages
        }
      }

      ws.onclose = () => {
        if (isUnmounted) return
        setConnected(false)
        // Auto-reconnect attempt
        reconnectTimeoutRef.current = setTimeout(connect, 2000)
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      isUnmounted = true
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [arenaId])

  const handleMessage = useCallback((msg: any) => {
    if (!msg || typeof msg !== 'object') return

    switch (msg.type) {
      case 'room_state': {
        const room = msg.room
        if (msg.selfId) setSelfId(msg.selfId)
        if (typeof msg.isHost === 'boolean') setIsHost(msg.isHost)
        if (room) {
          setRoomStatus(room.status)
          if (room.settings) setSettings(room.settings)
          if (Array.isArray(room.players)) setPlayers(room.players)
          if (typeof room.currentRound === 'number') setCurrentRound(room.currentRound)
          if (typeof room.totalRounds === 'number') setTotalRounds(room.totalRounds)
          if (typeof room.isInfinite === 'boolean') setIsInfinite(room.isInfinite)
          if (typeof room.timeLeft === 'number') setTimeLeft(room.timeLeft)
          if (room.question && room.question.text) setCurrentQuestion(room.question)
          if (room.revealedAnswer) setRevealedAnswer(room.revealedAnswer)
        }
        break
      }

      case 'player_status_change': {
        if (Array.isArray(msg.players)) {
          setPlayers(msg.players)
        }
        break
      }

      case 'player_joined': {
        if (Array.isArray(msg.players)) {
          setPlayers(msg.players)
        }
        break
      }

      case 'player_left': {
        if (Array.isArray(msg.players)) {
          setPlayers(msg.players)
        }
        if (msg.newHostId) {
          const currentId = getLocalPlayer().id
          setIsHost(msg.newHostId === currentId)
        }
        break
      }

      case 'player_ready': {
        if (Array.isArray(msg.players)) {
          setPlayers(msg.players)
        }
        break
      }

      case 'settings_updated': {
        if (msg.settings) {
          setSettings(msg.settings)
        }
        break
      }

      case 'game_started': {
        setRoomStatus('playing')
        soundManager.playClick()
        if (onGameStartedRef.current) {
          onGameStartedRef.current()
        }
        break
      }

      case 'new_round': {
        setRoomStatus('playing')
        setCurrentRound(msg.round)
        if (typeof msg.totalRounds === 'number') setTotalRounds(msg.totalRounds)
        if (typeof msg.isInfinite === 'boolean') setIsInfinite(msg.isInfinite)
        if (typeof msg.timePerRound === 'number') setTimeLeft(msg.timePerRound)
        if (msg.question) setCurrentQuestion(msg.question)
        if (Array.isArray(msg.players)) setPlayers(msg.players)

        // Reset per-round states
        setAnswerFeedback('none')
        setRevealedAnswer(null)
        setAcceptedAnswers([])
        setLastEarnedPoints(0)
        break
      }

      case 'tick': {
        if (typeof msg.timeLeft === 'number') {
          setTimeLeft(msg.timeLeft)
          if (msg.timeLeft <= 5 && msg.timeLeft > 0) {
            soundManager.playWarning()
          }
        }
        break
      }

      case 'answer_result': {
        if (msg.isCorrect) {
          soundManager.playCorrect()
          setAnswerFeedback('correct')
          if (typeof msg.points === 'number') {
            setLastEarnedPoints(msg.points)
          }
          if (msg.streak && msg.streak >= 3) {
            triggerStreakConfetti()
          }
        } else {
          soundManager.playWrong()
          setAnswerFeedback('wrong')
          setTimeout(() => {
            setAnswerFeedback(prev => (prev === 'wrong' ? 'none' : prev))
          }, 600)
        }
        break
      }

      case 'player_answered': {
        // Update players list with the new score & streak
        setPlayers(prev =>
          prev.map(p =>
            p.id === msg.playerId
              ? {
                  ...p,
                  score: msg.score,
                  streak: msg.streak,
                  hasAnswered: true,
                  answeredCorrectly: msg.isCorrect,
                  answerTime: msg.answerTime ?? p.answerTime,
                }
              : p
          )
        )
        break
      }

      case 'round_end': {
        setRoomStatus('reveal')
        if (msg.answer) setRevealedAnswer(msg.answer)
        if (Array.isArray(msg.acceptedAnswers)) setAcceptedAnswers(msg.acceptedAnswers)
        if (Array.isArray(msg.players)) setPlayers(msg.players)
        break
      }

      case 'game_over': {
        setRoomStatus('finished')
        soundManager.playVictory()
        triggerVictoryConfetti()

        if (Array.isArray(msg.leaderboard)) setLeaderboard(msg.leaderboard)
        if (Array.isArray(msg.podium)) setPodium(msg.podium)
        if (msg.winner) setWinner(msg.winner)
        break
      }

      case 'game_restarted': {
        setRoomStatus('waiting')
        setAnswerFeedback('none')
        setRevealedAnswer(null)
        setLeaderboard([])
        setPodium([])
        setWinner(null)
        if (msg.room && Array.isArray(msg.room.players)) {
          setPlayers(msg.room.players)
        }
        if (onGameRestartedRef.current) {
          onGameRestartedRef.current()
        }
        break
      }

      case 'chat_message': {
        setChatMessages(prev => [...prev.slice(-30), msg])
        break
      }
    }
  }, [])

  // Send actions
  const send = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload))
    }
  }, [])

  const sendReady = useCallback(
    (isReady?: boolean) => {
      send({ type: 'toggle_ready', isReady })
    },
    [send]
  )

  const updateSettings = useCallback(
    (newSettings: Partial<GameSettings>) => {
      send({ type: 'update_settings', settings: newSettings })
    },
    [send]
  )

  const startGame = useCallback(
    (customSettings?: Partial<GameSettings>) => {
      send({ type: 'start_game', settings: customSettings })
    },
    [send]
  )

  const submitAnswer = useCallback(
    (answer: string) => {
      send({ type: 'submit_answer', answer })
    },
    [send]
  )

  const restartGame = useCallback(() => {
    send({ type: 'restart_game' })
  }, [send])

  const sendChatMessage = useCallback(
    (text: string) => {
      send({ type: 'chat_message', text })
    },
    [send]
  )

  const requestCurrentRound = useCallback(() => {
    send({ type: 'request_current_round' })
  }, [send])

  const leaveArena = useCallback(() => {
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'leave',
            playerId: selfId,
          })
        )
      }
    } catch {}
  }, [send, selfId])

  // Recovery: if room is in progress but client missed the question packet, request it
  useEffect(() => {
    if (connected && (roomStatus === 'playing' || roomStatus === 'reveal') && !currentQuestion) {
      const timer = setTimeout(() => {
        requestCurrentRound()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [connected, roomStatus, currentQuestion, requestCurrentRound])

  const myPlayer = players.find(p => p.id === selfId)

  return {
    connected,
    selfId,
    selfName,
    isHost,
    myPlayer,
    players,
    roomStatus,
    settings,
    currentRound,
    totalRounds,
    isInfinite,
    timeLeft,
    currentQuestion,
    revealedAnswer,
    acceptedAnswers,
    answerFeedback,
    lastEarnedPoints,
    leaderboard,
    podium,
    winner,
    chatMessages,
    actions: {
      sendReady,
      updateSettings,
      startGame,
      submitAnswer,
      restartGame,
      sendChatMessage,
      requestCurrentRound,
      leaveArena,
    },
  }
}

