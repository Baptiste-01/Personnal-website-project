import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconArrowLeft, IconGamepad, IconUser, IconCrown, IconHash, IconClock,
  IconCheck, IconX, IconInfinity, IconTrophy, IconFlame, IconTarget
} from '../../components/Icons'
import AudioThemeControls from '../../components/AudioThemeControls'
import { soundManager } from '../../utils/sound'
import { triggerVictoryConfetti, triggerStreakConfetti } from '../../utils/confetti'
import type { Question, Category, Difficulty } from '../../types'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../types'
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
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse settings from URL
  const categories = (searchParams.get('categories') ?? 'geographie').split(',') as Category[]
  const difficulty = (searchParams.get('difficulty') ?? 'facile') as Difficulty
  const isInfinite = searchParams.get('infiniteRounds') === 'true' || searchParams.get('rounds') === 'infinite'
  const rawRounds = searchParams.get('rounds')
  const totalRounds = isInfinite ? Infinity : Number(rawRounds ?? '10')
  const timePerRound = Number(searchParams.get('time') ?? '20')
  const maxPoints = Number(searchParams.get('maxPoints') ?? '1000')
  const pointsPerAnswer = Number(searchParams.get('pointsPerAnswer') ?? '100')
  const catDiffsParam = searchParams.get('catDiffs')
  const catTagsParam = searchParams.get('catTags')
  const tagsParam = searchParams.get('tags')

  const [questions, setQuestions] = useState<Question[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [round, setRound] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timePerRound)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [roundScores, setRoundScores] = useState<number[]>([])
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [showHint, setShowHint] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)

  const questionIndex = questions.length > 0 ? (round % questions.length) : 0
  const currentQ = questions[questionIndex] ?? null

  // Fetch questions from API
  useEffect(() => {
    const fetchCount = isInfinite ? 30 : Math.min(50, totalRounds)
    const params = new URLSearchParams({
      count: String(fetchCount),
      categories: categories.join(','),
    })
    if (catDiffsParam) {
      params.set('catDiffs', catDiffsParam)
    } else {
      params.set('difficulty', difficulty)
    }
    if (catTagsParam) {
      params.set('catTags', catTagsParam)
    }
    if (tagsParam) {
      params.set('tags', tagsParam)
    }
    fetch(`http://localhost:3000/questions?${params}`)
      .then(r => r.json())
      .then((data: Question[]) => {
        setQuestions(data)
        setPhase('playing')
        setTimeLeft(timePerRound)
      })
      .catch(() => {
        // Fallback: use hardcoded questions if API fails
        setQuestions([
          { id: 1, text: 'Quel est ce célèbre monument de Paris ?', answer: 'Tour Eiffel', acceptedAnswers: ['tour eiffel', 'eiffel', 'la tour eiffel'], hint: 'Conçue par Gustave Eiffel', imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600&auto=format&fit=crop', category: 'geographie' as Category, difficulty: 'facile' as Difficulty },
          { id: 2, text: 'Quelle est la capitale de la France ?', answer: 'Paris', acceptedAnswers: ['paris'], hint: 'Ville lumière', category: 'geographie' as Category, difficulty: 'facile' as Difficulty },
          { id: 3, text: 'Qui a peint la Joconde ?', answer: 'Leonard de Vinci', acceptedAnswers: ['leonard de vinci', 'de vinci', 'vinci', 'da vinci'], hint: 'Artiste de la Renaissance', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa_%28Leonardo_da_Vinci%29.jpg/300px-Mona_Lisa_%28Leonardo_da_Vinci%29.jpg', category: 'histoire' as Category, difficulty: 'facile' as Difficulty },
          { id: 4, text: 'Quel est le symbole chimique de l\'eau ?', answer: 'H2O', acceptedAnswers: ['h2o'], hint: 'Deux éléments', category: 'sciences' as Category, difficulty: 'facile' as Difficulty },
        ])
        setPhase('playing')
        setTimeLeft(timePerRound)
      })
  }, [])

  // Timer & Audio Ticks
  useEffect(() => {
    if (phase !== 'playing' || timeLeft <= 0) return

    // Sound warning in the last 5 seconds
    if (timeLeft <= 5 && timeLeft > 0) {
      soundManager.playWarning()
    }

    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase, timeLeft])

  // Focus input on new round
  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus()
  }, [phase, round])

  const handleTimeUp = useCallback(() => {
    soundManager.playWrong()
    setFeedback('wrong')
    setStreak(0)
    setRoundScores(prev => [...prev, 0])
    setReactionTimes(prev => [...prev, timePerRound])
    setPhase('reveal')
  }, [timePerRound])

  const checkAnswer = () => {
    if (!currentQ || phase !== 'playing') return
    const normalized = normalize(answer)
    const isCorrect = currentQ.acceptedAnswers.some(a => normalize(a) === normalized) || normalize(currentQ.answer) === normalized

    if (isCorrect) {
      const timeTaken = Math.max(0.5, timePerRound - timeLeft)
      setReactionTimes(prev => [...prev, timeTaken])

      const nextStreak = streak + 1
      setStreak(nextStreak)
      setBestStreak(prev => Math.max(prev, nextStreak))

      const streakMultiplier = nextStreak >= 5 ? 2.0 : nextStreak >= 3 ? 1.5 : 1.0
      const speedBonus = Math.round((timeLeft / timePerRound) * (pointsPerAnswer * 0.5))
      const roundPts = Math.round((pointsPerAnswer + speedBonus) * streakMultiplier)
      setScore(prev => prev + roundPts)
      setRoundScores(prev => [...prev, roundPts])
      setFeedback('correct')
      setPhase('reveal')

      // Audio & Visual celebratory effects
      soundManager.playCorrect()
      if (nextStreak >= 3) {
        triggerStreakConfetti()
      }
    } else {
      soundManager.playWrong()
      setFeedback('wrong')
      setAnswer('')
      // Flash red briefly then let them retry
      setTimeout(() => { if (phase === 'playing') setFeedback('none') }, 400)
    }
  }

  const isWinCondition = score >= maxPoints || (!isInfinite && round + 1 >= totalRounds)

  const nextRound = () => {
    soundManager.playClick()
    if (isWinCondition) {
      setPhase('results')
      soundManager.playVictory()
      triggerVictoryConfetti()
      return
    }
    setRound(prev => prev + 1)
    setAnswer('')
    setFeedback('none')
    setShowHint(false)
    setTimeLeft(timePerRound)
    setPhase('playing')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (phase === 'playing') checkAnswer()
      else if (phase === 'reveal') nextRound()
    }
  }

  const timerPct = (timeLeft / timePerRound) * 100
  const timerColor = timeLeft > timePerRound * 0.5 ? 'var(--color-status-live)' : timeLeft > timePerRound * 0.25 ? 'var(--color-status-waiting)' : '#ef4444'

  // Performance calculations
  const correctCount = roundScores.filter(s => s > 0).length
  const accuracyPct = roundScores.length > 0 ? Math.round((correctCount / roundScores.length) * 100) : 0
  const avgReactionTime = reactionTimes.length > 0
    ? (reactionTimes.reduce((acc, t) => acc + t, 0) / reactionTimes.length).toFixed(1)
    : '0.0'

  return (
    <div className="fg" id="flashguess-page">
      {/* Top bar with sound & theme controls */}
      <header className="fg-topbar">
        <button className="fg-back" onClick={() => { soundManager.playClick(); navigate(`/arena/${arenaId}`) }}>
          <IconArrowLeft /><span>Retour</span>
        </button>
        <div className="fg-topbar-center">
          <div className="fg-topbar-icon"><IconGamepad /></div>
          <h1 className="fg-topbar-title">FlashGuess</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AudioThemeControls compact />
          <div className="fg-topbar-score">Score: <strong>{score} / {maxPoints} pts</strong></div>
        </div>
      </header>

      <div className="fg-layout">
        {/* Sidebar */}
        <aside className="fg-sidebar">
          <div className="fg-sidebar-header"><h2 className="fg-sidebar-title">Classement</h2></div>
          <div className="fg-player-card fg-player-card--self">
            <div className="fg-player-rank"><IconCrown /></div>
            <div className="fg-player-avatar"><IconUser /></div>
            <div className="fg-player-info">
              <span className="fg-player-name">Vous</span>
              <span className="fg-player-score">{score} pts</span>
            </div>
            {streak >= 3 && <span className="fg-streak-badge">x{streak}</span>}
          </div>
          <div className="fg-stats">
            <div className="fg-stat">
              <span className="fg-stat-label">Série</span>
              <span className="fg-stat-value">{streak}</span>
            </div>
            <div className="fg-stat">
              <span className="fg-stat-label">Manche</span>
              <span className="fg-stat-value">{isInfinite ? `${round + 1} (∞)` : `${round + 1}/${totalRounds}`}</span>
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
                    {isInfinite ? <><IconInfinity /> Manche {round + 1} (Victoire à {maxPoints} pts)</> : <><IconHash /> Manche {round + 1} / {totalRounds}</>}
                  </span>
                  <span className="fg-timer" style={{ color: timerColor }}><IconClock /> {timeLeft}s</span>
                </div>
                <div className="fg-timer-track"><div className="fg-timer-fill" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} /></div>
              </div>

              {/* Question */}
              <div className={`fg-prompt ${phase === 'reveal' ? 'fg-prompt--reveal' : ''}`}>
                <div className="fg-question-meta">
                  <span className="fg-cat-badge">
                    {CATEGORY_ICONS[currentQ.category] ?? '🏷️'} {CATEGORY_LABELS[currentQ.category] ?? currentQ.category}
                  </span>
                  {currentQ.tags && currentQ.tags.length > 0 && (
                    <div className="fg-tags-row">
                      {currentQ.tags.map(tag => (
                        <span key={tag} className="fg-tag-badge">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="fg-prompt-text">{currentQ.text}</p>

                {currentQ.imageUrl && (
                  <div className="fg-question-image-wrapper">
                    <img
                      src={currentQ.imageUrl}
                      alt="Illustration de la question"
                      className="fg-question-image"
                      onClick={() => { soundManager.playClick(); setModalImage(currentQ.imageUrl ?? null) }}
                      title="Cliquer pour agrandir"
                    />
                    <button
                      type="button"
                      className="fg-image-zoom-btn"
                      onClick={() => { soundManager.playClick(); setModalImage(currentQ.imageUrl ?? null) }}
                    >
                      🔍 Agrandir l'image
                    </button>
                  </div>
                )}

                {showHint && currentQ.hint && phase === 'playing' && (
                  <p className="fg-hint">Indice : {currentQ.hint}</p>
                )}
                {!showHint && phase === 'playing' && currentQ.hint && (
                  <button className="fg-hint-btn" onClick={() => { soundManager.playClick(); setShowHint(true) }}>
                    Afficher l'indice
                  </button>
                )}
              </div>

              {/* Answer input */}
              {phase === 'playing' && (
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
              )}

              {/* Reveal */}
              {phase === 'reveal' && (
                <div className="fg-reveal fade-in">
                  <div className={`fg-reveal-badge ${feedback === 'correct' ? 'fg-reveal-badge--correct' : 'fg-reveal-badge--wrong'}`}>
                    {feedback === 'correct' ? <><IconCheck /> Correct</> : <><IconX /> Temps écoulé</>}
                  </div>
                  <p className="fg-reveal-answer">Réponse : <strong>{currentQ.answer}</strong></p>
                  {feedback === 'correct' && <p className="fg-reveal-points">+{roundScores[roundScores.length - 1]} points</p>}
                  <button className="fg-next-btn" onClick={nextRound} id="next-round">
                    {isWinCondition ? 'Voir les résultats' : 'Manche suivante'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Celebratory Results & Podium Screen */}
          {phase === 'results' && (
            <div className="fg-results-card fade-in">
              <div className="fg-results-icon">{score >= maxPoints ? <IconTrophy /> : <IconCrown />}</div>
              <h2 className="fg-results-title">
                {score >= maxPoints ? `🏆 Victoire Éclatante !` : 'Partie Terminée !'}
              </h2>
              <p className="fg-results-score">Score final : <strong>{score} points</strong></p>

              {/* Dynamic Podium */}
              <div className="fg-podium">
                {/* 2nd Place */}
                <div className="fg-podium-step fg-podium-step--2">
                  <div className="fg-podium-player">
                    <div className="fg-podium-avatar">
                      <IconUser />
                    </div>
                    <span className="fg-podium-name">Alex_Pro</span>
                    <span className="fg-podium-score">{Math.max(200, Math.round(score * 0.75))} pts</span>
                  </div>
                  <div className="fg-podium-block">2</div>
                </div>

                {/* 1st Place */}
                <div className="fg-podium-step fg-podium-step--1">
                  <div className="fg-podium-player">
                    <div className="fg-podium-avatar">
                      <span className="fg-podium-crown">👑</span>
                      <IconUser />
                    </div>
                    <span className="fg-podium-name">Vous</span>
                    <span className="fg-podium-score" style={{ color: '#facc15' }}>{score} pts</span>
                  </div>
                  <div className="fg-podium-block">1</div>
                </div>

                {/* 3rd Place */}
                <div className="fg-podium-step fg-podium-step--3">
                  <div className="fg-podium-player">
                    <div className="fg-podium-avatar">
                      <IconUser />
                    </div>
                    <span className="fg-podium-name">Marie42</span>
                    <span className="fg-podium-score">{Math.max(100, Math.round(score * 0.5))} pts</span>
                  </div>
                  <div className="fg-podium-block">3</div>
                </div>
              </div>

              {/* Detailed Performance Metrics */}
              <div className="fg-metrics-grid">
                <div className="fg-metric-card">
                  <span className="fg-metric-icon"><IconTarget /></span>
                  <span className="fg-metric-label">Précision</span>
                  <span className="fg-metric-val">{accuracyPct}%</span>
                </div>
                <div className="fg-metric-card">
                  <span className="fg-metric-icon"><IconFlame /></span>
                  <span className="fg-metric-label">Max Série</span>
                  <span className="fg-metric-val">{bestStreak} 🔥</span>
                </div>
                <div className="fg-metric-card">
                  <span className="fg-metric-icon"><IconClock /></span>
                  <span className="fg-metric-label">Vitesse Moy.</span>
                  <span className="fg-metric-val">{avgReactionTime}s</span>
                </div>
              </div>

              <div className="fg-results-actions">
                <button
                  className="fg-replay-btn"
                  onClick={() => { soundManager.playClick(); window.location.reload() }}
                  id="replay"
                >
                  Rejouer
                </button>
                <button
                  className="fg-leave-btn"
                  onClick={() => { soundManager.playClick(); navigate('/') }}
                  id="leave"
                >
                  Retour au lobby
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Image zoom modal */}
      {modalImage && (
        <div className="fg-modal-backdrop fade-in" onClick={() => { soundManager.playClick(); setModalImage(null) }}>
          <div className="fg-modal-card" onClick={e => e.stopPropagation()}>
            <button className="fg-modal-close" onClick={() => { soundManager.playClick(); setModalImage(null) }} title="Fermer">✕</button>
            <img src={modalImage} alt="Illustration grand format" className="fg-modal-img" />
          </div>
        </div>
      )}
    </div>
  )
}
