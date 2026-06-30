import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { IconArrowLeft, IconGamepad, IconUser, IconCrown, IconHash, IconClock, IconCheck, IconX } from '../../components/Icons'
import type { Question, Category, Difficulty } from '../../types'
import { API_URL } from '../../lib/api'
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
  const totalRounds = Number(searchParams.get('rounds') ?? '10')
  const timePerRound = Number(searchParams.get('time') ?? '20')

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

  const currentQ = questions[round] ?? null

  // Fetch questions from API
  useEffect(() => {
    const params = new URLSearchParams({
      categories: categories.join(','),
      difficulty,
      count: String(totalRounds),
    })
    fetch(`${API_URL}/questions?${params}`)
      .then(r => r.json())
      .then((data: Question[]) => {
        setQuestions(data)
        setPhase('playing')
        setTimeLeft(timePerRound)
      })
      .catch(() => {
        // Fallback: use hardcoded questions if API fails
        setQuestions([
          { id: 1, text: 'Quelle est la capitale de la France ?', answer: 'Paris', acceptedAnswers: ['paris'], hint: 'Ville lumiere', category: 'geographie' as Category, difficulty: 'facile' as Difficulty },
          { id: 2, text: 'Qui a peint la Joconde ?', answer: 'Leonard de Vinci', acceptedAnswers: ['leonard de vinci', 'de vinci', 'vinci', 'da vinci'], hint: 'Artiste de la Renaissance', category: 'histoire' as Category, difficulty: 'facile' as Difficulty },
          { id: 3, text: 'Quel est le symbole chimique de l\'eau ?', answer: 'H2O', acceptedAnswers: ['h2o'], hint: 'Deux elements', category: 'sciences' as Category, difficulty: 'facile' as Difficulty },
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
      const speedBonus = Math.round((timeLeft / timePerRound) * 500)
      const roundPts = Math.round((1000 + speedBonus) * streakMultiplier)
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

  const nextRound = () => {
    if (round + 1 >= questions.length || round + 1 >= totalRounds) {
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
        <div className="fg-topbar-score">Score: <strong>{score}</strong></div>
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
            <div className="fg-stat"><span className="fg-stat-label">Serie</span><span className="fg-stat-value">{streak}</span></div>
            <div className="fg-stat"><span className="fg-stat-label">Manche</span><span className="fg-stat-value">{round + 1}/{Math.min(totalRounds, questions.length)}</span></div>
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
                  <span className="fg-round-label"><IconHash /> Manche {round + 1} / {Math.min(totalRounds, questions.length)}</span>
                  <span className="fg-timer" style={{ color: timerColor }}><IconClock /> {timeLeft}s</span>
                </div>
                <div className="fg-timer-track"><div className="fg-timer-fill" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} /></div>
              </div>

              {/* Question */}
              <div className={`fg-prompt ${phase === 'reveal' ? 'fg-prompt--reveal' : ''}`}>
                <p className="fg-prompt-text">{currentQ.text}</p>
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
                    placeholder="Tapez votre reponse..."
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
                    {feedback === 'correct' ? <><IconCheck /> Correct</> : <><IconX /> Temps ecoule</>}
                  </div>
                  <p className="fg-reveal-answer">Reponse : <strong>{currentQ.answer}</strong></p>
                  {feedback === 'correct' && <p className="fg-reveal-points">+{roundScores[roundScores.length - 1]} points</p>}
                  <button className="fg-next-btn" onClick={nextRound} id="next-round">
                    {round + 1 >= Math.min(totalRounds, questions.length) ? 'Voir les resultats' : 'Manche suivante'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {phase === 'results' && (
            <div className="fg-results fade-in">
              <div className="fg-results-icon"><IconCrown /></div>
              <h2 className="fg-results-title">Partie terminee</h2>
              <p className="fg-results-score">Score final : <strong>{score} points</strong></p>
              <p className="fg-results-detail">
                {roundScores.filter(s => s > 0).length} / {roundScores.length} reponses correctes
              </p>
              <div className="fg-results-actions">
                <button className="fg-replay-btn" onClick={() => window.location.reload()} id="replay">Rejouer</button>
                <button className="fg-leave-btn" onClick={() => navigate('/')} id="leave">Retour au lobby</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
