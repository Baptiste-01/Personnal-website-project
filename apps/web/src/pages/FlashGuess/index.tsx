import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { IconArrowLeft, IconGamepad, IconUser, IconCrown, IconHash, IconClock, IconCheck, IconX, IconInfinity, IconTrophy } from '../../components/Icons'
import type { Question, Category, Difficulty } from '../../types'
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

  const [questions, setQuestions] = useState<Question[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [round, setRound] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timePerRound)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'wrong'>('none')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [roundScores, setRoundScores] = useState<number[]>([])
  const [showHint, setShowHint] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)

  const questionIndex = questions.length > 0 ? (round % questions.length) : 0
  const currentQ = questions[questionIndex] ?? null

  // Fetch questions from API
  useEffect(() => {
    const fetchCount = isInfinite ? 30 : Math.min(50, totalRounds)
    const params = new URLSearchParams({
      count: String(fetchCount),
    })
    if (catDiffsParam) {
      params.set('catDiffs', catDiffsParam)
    } else {
      params.set('categories', categories.join(','))
      params.set('difficulty', difficulty)
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

  // Timer
  useEffect(() => {
    if (phase !== 'playing' || timeLeft <= 0) return
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleTimeUp(); return 0 }
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
    setFeedback('wrong')
    setStreak(0)
    setRoundScores(prev => [...prev, 0])
    setPhase('reveal')
  }, [])

  const checkAnswer = () => {
    if (!currentQ || phase !== 'playing') return
    const normalized = normalize(answer)
    const isCorrect = currentQ.acceptedAnswers.some(a => normalize(a) === normalized) || normalize(currentQ.answer) === normalized

    if (isCorrect) {
      const streakMultiplier = streak >= 5 ? 2.0 : streak >= 3 ? 1.5 : 1.0
      const speedBonus = Math.round((timeLeft / timePerRound) * (pointsPerAnswer * 0.5))
      const roundPts = Math.round((pointsPerAnswer + speedBonus) * streakMultiplier)
      setScore(prev => prev + roundPts)
      setStreak(prev => prev + 1)
      setRoundScores(prev => [...prev, roundPts])
      setFeedback('correct')
      setPhase('reveal')
    } else {
      setFeedback('wrong')
      setAnswer('')
      // Flash red briefly then let them retry
      setTimeout(() => { if (phase === 'playing') setFeedback('none') }, 400)
    }
  }

  const isWinCondition = score >= maxPoints || (!isInfinite && round + 1 >= totalRounds)

  const nextRound = () => {
    if (isWinCondition) {
      setPhase('results')
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

  return (
    <div className="fg" id="flashguess-page">
      {/* Top bar */}
      <header className="fg-topbar">
        <button className="fg-back" onClick={() => navigate(`/arena/${arenaId}`)}><IconArrowLeft /><span>Retour</span></button>
        <div className="fg-topbar-center"><div className="fg-topbar-icon"><IconGamepad /></div><h1 className="fg-topbar-title">FlashGuess</h1></div>
        <div className="fg-topbar-score">Score: <strong>{score} / {maxPoints} pts</strong></div>
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
            <div className="fg-stat"><span className="fg-stat-label">Série</span><span className="fg-stat-value">{streak}</span></div>
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

          {/* Results */}
          {phase === 'results' && (
            <div className="fg-results fade-in">
              <div className="fg-results-icon">{score >= maxPoints ? <IconTrophy /> : <IconCrown />}</div>
              <h2 className="fg-results-title">
                {score >= maxPoints ? `🏆 Victoire ! Score de ${maxPoints} pts atteint !` : 'Partie terminée'}
              </h2>
              <p className="fg-results-score">Score final : <strong>{score} points</strong></p>
              <p className="fg-results-detail">
                {roundScores.filter(s => s > 0).length} / {roundScores.length} réponses correctes
              </p>
              <div className="fg-results-actions">
                <button className="fg-replay-btn" onClick={() => window.location.reload()} id="replay">Rejouer</button>
                <button className="fg-leave-btn" onClick={() => navigate('/')} id="leave">Retour au lobby</button>
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
