import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconGamepad, IconUser, IconCrown, IconHash, IconClock,
  IconCheck, IconX, IconInfinity, IconTrophy, IconFlame, IconTarget, IconZap
} from '../../components/Icons'
import AudioThemeControls from '../../components/AudioThemeControls'
import { soundManager } from '../../utils/sound'
import { useArenaSocket } from '../../hooks/useArenaSocket'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../types'
import './FlashGuess.css'

export default function FlashGuess() {
  const { arenaId } = useParams<{ arenaId: string }>()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [answer, setAnswer] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)

  const {
    connected,
    selfId,
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
    actions,
  } = useArenaSocket({
    arenaId,
    onGameRestarted: () => navigate(`/arena/${arenaId}`),
  })

  // Autofocus input on each new round
  useEffect(() => {
    if (roomStatus === 'playing' && !myPlayer?.answeredCorrectly) {
      setAnswer('')
      setShowHint(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [roomStatus, currentRound, myPlayer?.answeredCorrectly])

  const handleSendAnswer = () => {
    const trimmed = answer.trim()
    if (!trimmed || roomStatus !== 'playing' || myPlayer?.answeredCorrectly) return
    actions.submitAnswer(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendAnswer()
    }
  }

  // Sorted players for real-time leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  // Timer visualization
  const maxTime = settings?.timePerRound ?? 20
  const timerPct = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100))
  const timerColor =
    timeLeft > maxTime * 0.5
      ? 'var(--color-status-live)'
      : timeLeft > maxTime * 0.25
        ? 'var(--color-status-waiting)'
        : '#ef4444'

  // Final performance calculations
  const effectiveLeaderboard = leaderboard.length > 0 ? leaderboard : sortedPlayers
  const effectivePodium = podium.length > 0 ? podium : effectiveLeaderboard.slice(0, 3)
  const effectiveWinner = winner || effectiveLeaderboard[0] || null

  return (
    <div className="fg" id="flashguess-page">
      {/* Top bar with sound & theme controls */}
      <header className="fg-topbar">
        <button
          className="fg-back"
          onClick={() => {
            soundManager.playClick()
            navigate(`/arena/${arenaId}`)
          }}
          title="Retour au salon d'arène"
        >
          <IconArrowLeft />
          <span>Salon</span>
        </button>

        <div className="fg-topbar-center">
          <div className="fg-topbar-icon">
            <IconGamepad />
          </div>
          <h1 className="fg-topbar-title">FlashGuess Multijoueur</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AudioThemeControls compact />
          <div className="fg-topbar-score">
            Score: <strong>{myPlayer?.score ?? 0} pts</strong>
            {settings?.maxPoints ? ` / ${settings.maxPoints} pts` : ''}
          </div>
        </div>
      </header>

      <div className="fg-layout">
        {/* Real-time Multiplayer Leaderboard Sidebar */}
        <aside className="fg-sidebar">
          <div className="fg-sidebar-header">
            <h2 className="fg-sidebar-title">Classement en direct</h2>
          </div>

          <div className="fg-players-list" style={{ padding: '8px 0', overflowY: 'auto', flex: 1 }}>
            {sortedPlayers.map((p, idx) => {
              const isSelf = p.id === selfId
              const isFirst = idx === 0
              return (
                <div
                  key={p.id}
                  className={`fg-player-card ${isSelf ? 'fg-player-card--self' : ''}`}
                >
                  <div className="fg-player-rank">
                    {isFirst ? <IconCrown /> : `#${idx + 1}`}
                  </div>
                  <div className="fg-player-avatar">
                    <IconUser />
                  </div>
                  <div className="fg-player-info">
                    <span className="fg-player-name">
                      {p.name}
                      {isSelf && <span className="ap-self-badge">Vous</span>}
                      {p.isHost && <span className="ap-host-badge" style={{ marginLeft: 4 }}>👑</span>}
                    </span>
                    <span className="fg-player-score">{p.score} pts</span>
                  </div>

                  {/* Live status badge */}
                  {roomStatus === 'playing' && (
                    p.answeredCorrectly ? (
                      <span className="fg-player-status fg-player-status--done" title="A trouvé !">
                        <IconCheck /> OK
                      </span>
                    ) : (
                      <span className="fg-player-status fg-player-status--thinking" title="En train de chercher...">
                        •••
                      </span>
                    )
                  )}

                  {roomStatus === 'reveal' && (
                    p.answeredCorrectly ? (
                      <span className="fg-player-status fg-player-status--done">
                        <IconCheck /> +{p.answerTime ? `${p.answerTime.toFixed(1)}s` : 'pts'}
                      </span>
                    ) : (
                      <span className="fg-player-status fg-player-status--wrong">
                        <IconX /> 0 pt
                      </span>
                    )
                  )}

                  {p.streak >= 3 && <span className="fg-streak-badge">x{p.streak} 🔥</span>}
                </div>
              )
            })}
          </div>

          <div className="fg-stats">
            <div className="fg-stat">
              <span className="fg-stat-label">Série</span>
              <span className="fg-stat-value">{myPlayer?.streak ?? 0}</span>
            </div>
            <div className="fg-stat">
              <span className="fg-stat-label">Manche</span>
              <span className="fg-stat-value">
                {isInfinite ? `${currentRound + 1} (∞)` : `${currentRound + 1}/${totalRounds || 10}`}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="fg-main">
          {/* Waiting for host to launch */}
          {connected && roomStatus === 'waiting' && (
            <div className="fg-loading fade-in" style={{ maxWidth: 480 }}>
              <div className="fg-spinner" style={{ marginBottom: 16 }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>
                {isHost ? 'Prêt à démarrer FlashGuess ?' : 'En attente du lancement par l\'hôte...'}
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                {isHost
                  ? 'Tous les joueurs sont connectés. Vous pouvez démarrer la partie immédiatement !'
                  : 'L\'hôte va démarrer la manche dans un instant.'}
              </p>
              {isHost && (
                <button
                  type="button"
                  className="fg-submit-btn"
                  onClick={() => actions.startGame()}
                  id="fg-start-now-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 auto' }}
                >
                  <IconZap /> Démarrer la partie maintenant
                </button>
              )}
            </div>
          )}

          {/* Loading state while connecting or awaiting question payload */}
          {(!connected || (!currentQuestion && (roomStatus === 'playing' || roomStatus === 'reveal'))) && (
            <div className="fg-loading fade-in">
              <div className="fg-spinner" />
              <p>Connexion et synchronisation avec la partie multijoueur...</p>
            </div>
          )}

          {/* Playing / Reveal Phase */}
          {currentQuestion && (roomStatus === 'playing' || roomStatus === 'reveal') && (
            <div className="fg-question-area fade-in">
              {/* Progress bar and synchronized countdown */}
              <div className="fg-progress-bar">
                <div className="fg-progress-header">
                  <span className="fg-round-label">
                    {isInfinite ? (
                      <>
                        <IconInfinity /> Manche {currentRound + 1} (Victoire à {settings?.maxPoints ?? 1000} pts)
                      </>
                    ) : (
                      <>
                        <IconHash /> Manche {currentRound + 1} / {totalRounds}
                      </>
                    )}
                  </span>
                  <span className="fg-timer" style={{ color: timerColor }}>
                    <IconClock /> {timeLeft}s
                  </span>
                </div>
                <div className="fg-timer-track">
                  <div
                    className="fg-timer-fill"
                    style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                  />
                </div>
              </div>

              {/* Question prompt */}
              <div className={`fg-prompt ${roomStatus === 'reveal' ? 'fg-prompt--reveal' : ''}`}>
                <div className="fg-question-meta">
                  <span className="fg-cat-badge">
                    {CATEGORY_ICONS[currentQuestion.category] ?? '🏷️'}{' '}
                    {CATEGORY_LABELS[currentQuestion.category] ?? currentQuestion.category}
                  </span>
                  {currentQuestion.tags && currentQuestion.tags.length > 0 && (
                    <div className="fg-tags-row">
                      {currentQuestion.tags.map(tag => (
                        <span key={tag} className="fg-tag-badge">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="fg-prompt-text">{currentQuestion.text}</p>

                {currentQuestion.imageUrl && (
                  <div className="fg-question-image-wrapper">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Illustration de la question"
                      className="fg-question-image"
                      onClick={() => {
                        soundManager.playClick()
                        setModalImage(currentQuestion.imageUrl ?? null)
                      }}
                      title="Cliquer pour agrandir"
                    />
                    <button
                      type="button"
                      className="fg-image-zoom-btn"
                      onClick={() => {
                        soundManager.playClick()
                        setModalImage(currentQuestion.imageUrl ?? null)
                      }}
                    >
                      🔍 Agrandir l'image
                    </button>
                  </div>
                )}

                {showHint && currentQuestion.hint && roomStatus === 'playing' && (
                  <p className="fg-hint">Indice : {currentQuestion.hint}</p>
                )}
                {!showHint && roomStatus === 'playing' && currentQuestion.hint && (
                  <button
                    className="fg-hint-btn"
                    onClick={() => {
                      soundManager.playClick()
                      setShowHint(true)
                    }}
                  >
                    Afficher l'indice
                  </button>
                )}
              </div>

              {/* Input Area */}
              {roomStatus === 'playing' && (
                myPlayer?.answeredCorrectly ? (
                  <div className="fg-answered-notice">
                    <IconCheck />
                    <span>Bonne réponse trouvée ! (+{lastEarnedPoints} pts) En attente des autres joueurs...</span>
                  </div>
                ) : (
                  <div
                    className={`fg-answer-area ${answerFeedback === 'wrong' ? 'fg-answer-area--shake' : ''
                      }`}
                  >
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
                    <button
                      className="fg-submit-btn"
                      onClick={handleSendAnswer}
                      id="submit-answer"
                    >
                      Valider
                    </button>
                  </div>
                )
              )}

              {/* Reveal Phase */}
              {roomStatus === 'reveal' && (
                <div className="fg-reveal fade-in">
                  <div
                    className={`fg-reveal-badge ${myPlayer?.answeredCorrectly
                        ? 'fg-reveal-badge--correct'
                        : 'fg-reveal-badge--wrong'
                      }`}
                  >
                    {myPlayer?.answeredCorrectly ? (
                      <>
                        <IconCheck /> Bonne réponse (+{lastEarnedPoints} pts)
                      </>
                    ) : (
                      <>
                        <IconX /> Temps écoulé ou non trouvé
                      </>
                    )}
                  </div>
                  <p className="fg-reveal-answer">
                    Réponse : <strong>{revealedAnswer || '...'}</strong>
                  </p>
                  {acceptedAnswers.length > 1 && (
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                      Variantes acceptées : {acceptedAnswers.join(', ')}
                    </p>
                  )}
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                    Manche suivante dans quelques secondes...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Celebratory Multiplayer Podium & Results Screen */}
          {roomStatus === 'finished' && (
            <div className="fg-results-card fade-in" style={{ maxWidth: 650, width: '100%' }}>
              <div className="fg-results-icon">
                <IconTrophy />
              </div>
              <h2 className="fg-results-title">Partie Terminée !</h2>
              {effectiveWinner && (
                <p className="fg-results-score">
                  🏆 Victoire de <strong>{effectiveWinner.name}</strong> avec{' '}
                  <strong>{effectiveWinner.score} points</strong> !
                </p>
              )}

              {/* Real-time Multiplayer Podium */}
              {effectivePodium.length > 1 ? (
                <div className="fg-podium fg-podium--multi">
                  {/* 2nd Place */}
                  {effectivePodium[1] && (
                    <div className="fg-podium-step fg-podium-step--2">
                      <div className="fg-podium-player">
                        <div className="fg-podium-avatar">
                          <span className="fg-podium-crown">🥈</span>
                          <IconUser />
                        </div>
                        <span className="fg-podium-name">{effectivePodium[1].name}</span>
                        <span className="fg-podium-score" style={{ color: '#cbd5e1' }}>
                          {effectivePodium[1].score} pts
                        </span>
                      </div>
                      <div className="fg-podium-block">2</div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {effectivePodium[0] && (
                    <div className="fg-podium-step fg-podium-step--1">
                      <div className="fg-podium-player">
                        <div className="fg-podium-avatar">
                          <span className="fg-podium-crown">👑</span>
                          <IconUser />
                        </div>
                        <span className="fg-podium-name">{effectivePodium[0].name}</span>
                        <span className="fg-podium-score" style={{ color: '#facc15' }}>
                          {effectivePodium[0].score} pts
                        </span>
                      </div>
                      <div className="fg-podium-block">1</div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {effectivePodium[2] && (
                    <div className="fg-podium-step fg-podium-step--3">
                      <div className="fg-podium-player">
                        <div className="fg-podium-avatar">
                          <span className="fg-podium-crown">🥉</span>
                          <IconUser />
                        </div>
                        <span className="fg-podium-name">{effectivePodium[2].name}</span>
                        <span className="fg-podium-score" style={{ color: '#f59e0b' }}>
                          {effectivePodium[2].score} pts
                        </span>
                      </div>
                      <div className="fg-podium-block">3</div>
                    </div>
                  )}
                </div>
              ) : (
                /* Solo podium fallback */
                <div className="fg-podium fg-podium--solo">
                  <div className="fg-podium-step fg-podium-step--1">
                    <div className="fg-podium-player">
                      <div className="fg-podium-avatar">
                        <span className="fg-podium-crown">👑</span>
                        <IconUser />
                      </div>
                      <span className="fg-podium-name">{myPlayer?.name || 'Vous'}</span>
                      <span className="fg-podium-score" style={{ color: '#facc15' }}>
                        {myPlayer?.score ?? 0} pts
                      </span>
                    </div>
                    <div className="fg-podium-block">1</div>
                  </div>
                </div>
              )}

              {/* Full Multiplayer Leaderboard Table */}
              <table className="fg-leaderboard-table">
                <thead>
                  <tr>
                    <th>Rang</th>
                    <th>Joueur</th>
                    <th>Score</th>
                    <th>Meilleure Série</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveLeaderboard.map((p, idx) => (
                    <tr key={p.id} className={p.id === selfId ? 'fg-row-self' : ''}>
                      <td>{idx === 0 ? '🥇 1er' : idx === 1 ? '🥈 2e' : idx === 2 ? '🥉 3e' : `#${idx + 1}`}</td>
                      <td>
                        {p.name}
                        {p.id === selfId && ' (Vous)'}
                        {p.isHost && ' 👑'}
                      </td>
                      <td>
                        <strong>{p.score} pts</strong>
                      </td>
                      <td>{p.bestStreak > 0 ? `${p.bestStreak} 🔥` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Performance Metrics for Current Player */}
              <div className="fg-metrics-grid">
                <div className="fg-metric-card">
                  <span className="fg-metric-icon">
                    <IconTarget />
                  </span>
                  <span className="fg-metric-label">Mon Score</span>
                  <span className="fg-metric-val">{myPlayer?.score ?? 0}</span>
                </div>
                <div className="fg-metric-card">
                  <span className="fg-metric-icon">
                    <IconFlame />
                  </span>
                  <span className="fg-metric-label">Max Série</span>
                  <span className="fg-metric-val">{myPlayer?.bestStreak ?? 0} 🔥</span>
                </div>
                <div className="fg-metric-card">
                  <span className="fg-metric-icon">
                    <IconTrophy />
                  </span>
                  <span className="fg-metric-label">Classement</span>
                  <span className="fg-metric-val">
                    #{effectiveLeaderboard.findIndex(p => p.id === selfId) + 1}
                  </span>
                </div>
              </div>

              <div className="fg-results-actions">
                {isHost && (
                  <button
                    className="fg-replay-btn"
                    onClick={() => {
                      soundManager.playClick()
                      actions.restartGame()
                    }}
                    id="replay-together"
                  >
                    🔄 Rejouer ensemble
                  </button>
                )}
                <button
                  className="fg-leave-btn"
                  onClick={() => {
                    soundManager.playClick()
                    navigate(`/arena/${arenaId}`)
                  }}
                  id="leave-to-arena"
                >
                  Salon d'arène
                </button>
                <button
                  className="fg-leave-btn"
                  onClick={() => {
                    soundManager.playClick()
                    navigate('/')
                  }}
                  id="leave-to-lobby"
                >
                  Lobby principal
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Image zoom modal */}
      {modalImage && (
        <div
          className="fg-modal-backdrop fade-in"
          onClick={() => {
            soundManager.playClick()
            setModalImage(null)
          }}
        >
          <div className="fg-modal-card" onClick={e => e.stopPropagation()}>
            <button
              className="fg-modal-close"
              onClick={() => {
                soundManager.playClick()
                setModalImage(null)
              }}
              title="Fermer"
            >
              ✕
            </button>
            <img src={modalImage} alt="Illustration grand format" className="fg-modal-img" />
          </div>
        </div>
      )}
    </div>
  )
}
