import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { IconArrowLeft, IconGamepad, IconUser, IconCrown, IconHash, IconClock, IconCheck, IconX, IconInfinity, IconTrophy } from '../../components/Icons'
import type { Question, Category, Difficulty } from '../../types'
import { useArenaSocket } from '../../hooks/useArenaSocket'
import './FlashGuess.css'

/** Remove accents and lowercase for matching */
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

type Phase = 'loading' | 'playing' | 'reveal' | 'results'

export default function FlashGuess() {
  const { arenaId } = useParams<{ arenaId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)

  const initialQuestions = (location.state as { questions?: Question[] })?.questions

  // Parse settings from URL
  const categories = (searchParams.get('categories') ?? 'geographie').split(',') as Category[]
  const difficulty = (searchParams.get('difficulty') ?? 'facile') as Difficulty
  const isInfinite = searchParams.get('infiniteRounds') === 'true' || searchParams.get('rounds') === 'infinite'
  const rawRounds = searchParams.get('rounds')
  const totalRounds = isInfinite ? Infinity : (rawRounds && !isNaN(Number(rawRounds)) ? Number(rawRounds) : 10)
  
  const catDiffsParam = searchParams.get('catDiffs')

  const socket = useArenaSocket(arenaId)

  const rawTime = searchParams.get('time')
  const timePerRound = (socket.settings?.timePerRound && typeof socket.settings.timePerRound === 'number')
    ? socket.settings.timePerRound
    : Math.max(5, (rawTime && !isNaN(Number(rawTime)) ? Number(rawTime) : 20))

  const rawMaxPts = searchParams.get('maxPoints')
  const maxPoints = (socket.settings?.maxPoints && typeof socket.settings.maxPoints === 'number')
    ? socket.settings.maxPoints
    : (rawMaxPts && !isNaN(Number(rawMaxPts)) ? Number(rawMaxPts) : 1000)

  const rawPtsAns = searchParams.get('pointsPerAnswer')
  const pointsPerAnswer = (socket.settings?.pointsPerAnswer && typeof socket.settings.pointsPerAnswer === 'number')
    ? socket.settings.pointsPerAnswer
    : (rawPtsAns && !isNaN(Number(rawPtsAns)) ? Number(rawPtsAns) : 100)

  const [questions, setQuestions] = useState<Question[]>(() => (
    socket.questions && socket.questions.length > 0
      ? socket.questions
      : initialQuestions && initialQuestions.length > 0
      ? initialQuestions
      : []
  ))

  const [phase, setPhase] = useState<Phase>(() => (
    (socket.questions && socket.questions.length > 0) || (initialQuestions && initialQuestions.length > 0)
      ? 'playing'
      : 'loading'
  ))

  const [round, setRound] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number>(timePerRound)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none')
  const [score, setScore] = useState(0)
  const [roundScores, setRoundScores] = useState<number[]>([])
  const [showHint, setShowHint] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)

  // Reset timeLeft when round or timePerRound changes
  useEffect(() => {
    setTimeLeft(timePerRound)
  }, [round, timePerRound])

  // Sync WS questions (received from room manager) as single source of truth
  useEffect(() => {
    if (socket.questions && socket.questions.length > 0) {
      setQuestions(socket.questions)
      setPhase(prev => (prev === 'loading' ? 'playing' : prev))
      return
    }

    if (questions.length > 0) return

    // Timeout fallback if socket questions take more than 800ms
    const timer = setTimeout(() => {
      if (questions.length === 0) {
        const fetchCount = isInfinite ? 30 : Math.min(50, totalRounds)
        const params = new URLSearchParams({ count: String(fetchCount) })
        if (catDiffsParam) {
          params.set('catDiffs', catDiffsParam)
        } else {
          params.set('categories', categories.join(','))
          params.set('difficulty', difficulty)
        }
        fetch(`/questions?${params}`)
          .then(r => r.json())
          .then((data: Question[]) => {
            if (data && data.length > 0) {
              setQuestions(data)
              setPhase(prev => (prev === 'loading' ? 'playing' : prev))
            }
          })
          .catch(() => {})
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [socket.questions, questions.length, isInfinite, totalRounds, catDiffsParam, categories, difficulty])

  // Sync WS current round if updated by host
  useEffect(() => {
    if (typeof socket.currentRound === 'number' && socket.currentRound > round) {
      setRound(socket.currentRound)
      setAnswer('')
      setFeedback('none')
      setShowHint(false)
      setHasAnsweredThisRound(false)
      setTimeLeft(timePerRound)
      setPhase('playing')
    }
  }, [socket.currentRound, timePerRound, round])

  const questionIndex = questions.length > 0 ? (round % questions.length) : 0
  const currentQ = questions[questionIndex] ?? null

  const lastHandledRevealRef = useRef<number>(0)

  const handleTimeUp = useCallback(() => {
    setPhase('reveal')
    setFeedback(prev => (prev === 'correct' ? 'correct' : 'wrong'))
    setRevealCountdown(5)
    lastHandledRevealRef.current = Date.now()
    if (socket.connected) {
      socket.triggerReveal()
    }
  }, [socket])

  // Timer countdown per round
  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [phase, round])

  // Trigger reveal when time runs out
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      handleTimeUp()
    }
  }, [phase, timeLeft, handleTimeUp])

  // Focus input on new round
  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus()
  }, [phase, round])

  const [hasAnsweredThisRound, setHasAnsweredThisRound] = useState(false)
  const [revealCountdown, setRevealCountdown] = useState(5)

  // Listen to WebSocket revealEvent broadcast (when all answer or timer finishes)
  useEffect(() => {
    if (socket.revealEvent && socket.revealEvent.timestamp > lastHandledRevealRef.current) {
      lastHandledRevealRef.current = socket.revealEvent.timestamp
      setPhase('reveal')
      setFeedback(prev => (prev === 'correct' ? 'correct' : 'wrong'))
      setRevealCountdown(5)
    }
  }, [socket.revealEvent])

  const isWinCondition = score >= maxPoints || (!isInfinite && round + 1 >= totalRounds)

  const nextRound = useCallback(() => {
    if (isWinCondition) {
      setPhase('results')
      return
    }
    if (socket.connected) {
      socket.nextRound()
    }
    setRound(r => r + 1)
    setAnswer('')
    setFeedback('none')
    setShowHint(false)
    setHasAnsweredThisRound(false)
    setTimeLeft(timePerRound)
    setPhase('playing')
  }, [isWinCondition, socket, timePerRound])

  // Automatic 5-second countdown on reveal before advancing
  useEffect(() => {
    if (phase !== 'reveal') return
    const t = setInterval(() => {
      setRevealCountdown(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [phase, round])

  // Trigger next round when reveal countdown completes
  useEffect(() => {
    if (phase === 'reveal' && revealCountdown === 0) {
      nextRound()
    }
  }, [phase, revealCountdown, nextRound])

  const checkAnswer = () => {
    if (!currentQ || phase !== 'playing' || hasAnsweredThisRound) return
    const normalized = normalize(answer)
    const isCorrect = currentQ.acceptedAnswers.some(a => normalize(a) === normalized) || normalize(currentQ.answer) === normalized

    if (isCorrect) {
      setFeedback('correct')
      setHasAnsweredThisRound(true)

      // In solo mode, calculate points immediately
      if (!socket.connected || socket.players.length <= 1) {
        const roundPts = pointsPerAnswer
        const newScore = score + roundPts
        setScore(newScore)
        setRoundScores(prev => [...prev, roundPts])
        socket.submitAnswer(answer, newScore)
        lastHandledRevealRef.current = Date.now()
        setPhase('reveal')
        setRevealCountdown(5)
      } else {
        // In multiplayer, submit answer to server for relative timing calculation
        socket.submitAnswer(answer)
      }
    } else {
      socket.submitAnswer(answer)
      setFeedback('wrong')
      setAnswer('')
      setTimeout(() => { if (phase === 'playing') setFeedback('none') }, 400)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (phase === 'playing') checkAnswer()
      else if (phase === 'reveal') nextRound()
    }
  }
  const { currentUserId, currentUsername } = (() => {
    const userStr = localStorage.getItem('auth_user')
    if (userStr) {
      try {
        const u = JSON.parse(userStr)
        return {
          currentUserId: u.id ? String(u.id) : '',
          currentUsername: u.username || 'Joueur',
        }
      } catch {}
    }
    const guestId = sessionStorage.getItem('guest_user_id') || localStorage.getItem('guest_user_id') || ''
    const guestName = sessionStorage.getItem('guest_username') || localStorage.getItem('guest_username') || 'Joueur'
    return { currentUserId: guestId, currentUsername: guestName }
  })()

  // Sync round score with WS answer result in multiplayer
  useEffect(() => {
    if (socket.latestAnswerResult) {
      const isSelf =
        socket.latestAnswerResult.playerId === currentUserId ||
        socket.latestAnswerResult.playerName === currentUsername
      if (isSelf && socket.latestAnswerResult.isCorrect) {
        setRoundScores(prev => [...prev, socket.latestAnswerResult!.pointsAwarded])
      }
    }
  }, [socket.latestAnswerResult, currentUserId, currentUsername])

  // Sync score with WS player state
  useEffect(() => {
    if (socket.players && socket.players.length > 0) {
      const selfP = socket.players.find(p => p.id === currentUserId || p.name === currentUsername)
      if (selfP && typeof selfP.score === 'number' && selfP.score !== score) {
        setScore(selfP.score)
      }
    }
  }, [socket.players, currentUserId, currentUsername, score])

  const handleReturnToLobby = () => {
    if (socket.connected) {
      socket.returnToLobby()
    }
    navigate(`/arena/${arenaId}`)
  }

  const timerPct = (timeLeft / timePerRound) * 100
  const timerColor = timeLeft > timePerRound * 0.5 ? 'var(--color-status-live)' : timeLeft > timePerRound * 0.25 ? 'var(--color-status-waiting)' : '#ef4444'

  const displayTotalRounds = questions.length > 0 ? questions.length : totalRounds

  return (
    <div className="fg" id="flashguess-page">
      {/* Top bar */}
      <header className="fg-topbar">
        <button className="fg-back" onClick={handleReturnToLobby}><IconArrowLeft /><span>Retour</span></button>
        <div className="fg-topbar-center"><div className="fg-topbar-icon"><IconGamepad /></div><h1 className="fg-topbar-title">FlashGuess</h1></div>
        <div className="fg-topbar-score">Score: <strong>{score} / {maxPoints} pts</strong></div>
      </header>

      <div className="fg-layout">
        {/* Sidebar */}
        <aside className="fg-sidebar">
          <div className="fg-sidebar-header"><h2 className="fg-sidebar-title">Classement en direct</h2></div>
          <div className="fg-player-list">
            {(socket.players.length > 0 ? [...socket.players].sort((a, b) => b.score - a.score) : []).map((p, idx) => {
              const isSelf = p.id === currentUserId || p.name === currentUsername
              return (
                <div key={p.id} className={`fg-player-card ${isSelf ? 'fg-player-card--self' : ''}`}>
                  <div className="fg-player-rank">{idx === 0 ? <IconCrown /> : `#${idx + 1}`}</div>
                  <div className="fg-player-avatar"><IconUser /></div>
                  <div className="fg-player-info">
                    <span className="fg-player-name">{p.name} {isSelf ? '(Vous)' : ''}</span>
                    <span className="fg-player-score">{p.score} pts</span>
                  </div>
                </div>
              )
            })}
            {socket.players.length === 0 && (
              <div className="fg-player-card fg-player-card--self">
                <div className="fg-player-rank"><IconCrown /></div>
                <div className="fg-player-avatar"><IconUser /></div>
                <div className="fg-player-info">
                  <span className="fg-player-name">{currentUsername} (Vous)</span>
                  <span className="fg-player-score">{score} pts</span>
                </div>
              </div>
            )}
          </div>

          <div className="fg-stats">
            <div className="fg-stat">
              <span className="fg-stat-label">MANCHE</span>
              <span className="fg-stat-value">
                {isInfinite ? `${round + 1} (∞)` : `${Math.min(round + 1, displayTotalRounds)}/${displayTotalRounds}`}
              </span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="fg-main">
          {/* Loading */}
          {phase === 'loading' && (
            <div className="fg-loading fade-in"><div className="fg-spinner" /><p>Chargement des questions...</p></div>
          )}

          {/* Playing / Reveal */}
          {(phase === 'playing' || phase === 'reveal') && currentQ && (
            <div className="fg-question-area fade-in">
              {/* Progress */}
              <div className="fg-progress-bar">
                <div className="fg-progress-header">
                  <span className="fg-round-label">
                    {isInfinite ? <><IconInfinity /> Manche {round + 1} (Victoire à {maxPoints} pts)</> : <><IconHash /> Manche {round + 1} / {displayTotalRounds}</>}
                  </span>
                  <span className="fg-timer" style={{ color: timerColor }}><IconClock /> {timeLeft}s</span>
                </div>
                <div className="fg-timer-track"><div className="fg-timer-fill" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} /></div>
              </div>

              {/* Question */}
              <div className={`fg-prompt ${phase === 'reveal' ? 'fg-prompt--reveal' : ''}`}>
                <p className="fg-prompt-text">{currentQ.text}</p>

                {currentQ.imageUrl && (
                  <div className="fg-question-image-wrapper">
                    <img
                      src={currentQ.imageUrl}
                      alt="Illustration de la question"
                      className="fg-question-image"
                      onClick={() => setModalImage(currentQ.imageUrl ?? null)}
                      title="Cliquer pour agrandir"
                    />
                    <button
                      type="button"
                      className="fg-image-zoom-btn"
                      onClick={() => setModalImage(currentQ.imageUrl ?? null)}
                    >
                      🔍 Agrandir l'image
                    </button>
                  </div>
                )}

                {showHint && currentQ.hint && phase === 'playing' && (
                  <p className="fg-hint">Indice : {currentQ.hint}</p>
                )}
                {!showHint && phase === 'playing' && currentQ.hint && (
                  <button className="fg-hint-btn" onClick={() => setShowHint(true)}>Afficher l'indice</button>
                )}
              </div>

              {/* Answer input or Waiting banner */}
              {phase === 'playing' && (
                hasAnsweredThisRound ? (
                  <div className="fg-waiting-banner fade-in">
                    <span className="fg-waiting-spinner" />
                    <span>✅ Réponse validée ! En attente des autres joueurs...</span>
                  </div>
                ) : (
                  <div className={`fg-answer-area ${feedback === 'wrong' ? 'fg-answer-area--shake' : ''}`}>
                    <input
                      ref={inputRef}
                      type="text"
                      className="fg-answer-input"
                      placeholder="Tapez votre réponse..."
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoComplete="off"
                      autoFocus
                      id="answer-input"
                    />
                    <button className="fg-submit-btn" onClick={checkAnswer} id="submit-answer">Valider</button>
                  </div>
                )
              )}

              {/* Reveal */}
              {phase === 'reveal' && (
                <div className="fg-reveal fade-in">
                  <div className={`fg-reveal-badge ${feedback === 'correct' ? 'fg-reveal-badge--correct' : 'fg-reveal-badge--wrong'}`}>
                    {feedback === 'correct' ? <><IconCheck /> Correct !</> : <><IconX /> Temps écoulé</>}
                  </div>
                  <p className="fg-reveal-answer">Réponse : <strong>{currentQ.answer}</strong></p>
                  {feedback === 'correct' && roundScores.length > 0 && (
                    <p className="fg-reveal-points">+{roundScores[roundScores.length - 1]} points</p>
                  )}
                  <div className="fg-reveal-timer">
                    <div className="fg-countdown-notice">
                      ⚡ Prochaine manche dans <strong>{revealCountdown}s</strong>...
                    </div>
                    <div className="fg-reveal-timer-track">
                      <div className="fg-reveal-timer-fill" style={{ width: `${(revealCountdown / 5) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {phase === 'results' && (
            <div className="fg-results fade-in">
              <div className="fg-results-icon">{score >= maxPoints ? <IconTrophy /> : <IconCrown />}</div>
              <h2 className="fg-results-title">
                {score >= maxPoints ? `🏆 Victoire ! Score de ${maxPoints} pts atteint !` : 'Partie terminée'}
              </h2>
              <p className="fg-results-score">Score final : <strong>{score} points</strong></p>
              <p className="fg-results-detail">
                {roundScores.filter(s => s > 0).length} / {!isInfinite && score < maxPoints ? displayTotalRounds : (round + 1)} {roundScores.filter(s => s > 0).length > 1 ? 'bonnes réponses' : 'bonne réponse'}
              </p>
              <div className="fg-results-actions">
                <button className="fg-replay-btn" onClick={() => window.location.reload()} id="replay">Rejouer</button>
                <button className="fg-leave-btn" onClick={handleReturnToLobby} id="leave">Retour au lobby</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Image zoom modal */}
      {modalImage && (
        <div className="fg-modal-backdrop fade-in" onClick={() => setModalImage(null)}>
          <div className="fg-modal-card" onClick={e => e.stopPropagation()}>
            <button className="fg-modal-close" onClick={() => setModalImage(null)} title="Fermer">✕</button>
            <img src={modalImage} alt="Illustration grand format" className="fg-modal-img" />
          </div>
        </div>
      )}
    </div>
  )
}
