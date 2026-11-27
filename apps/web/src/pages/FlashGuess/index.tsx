import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconGamepad, IconUser, IconHash, IconClock,
  IconCheck, IconX, IconInfinity, IconTrophy, IconFlame, IconTarget, IconZap,
  IconMessageCircle
} from '../../components/Icons'
import AudioThemeControls from '../../components/AudioThemeControls'
import ArenaChat from '../../components/ArenaChat/ArenaChat'
import { soundManager } from '../../utils/sound'
import { useArenaSocket } from '../../hooks/useArenaSocket'
import { API_URL } from '../../utils/config'
import './FlashGuess.css'

function getDifficultyBadge(difficulty?: string): { key: 'facile' | 'moyen' | 'difficile'; emoji: string; label: string } | null {
  if (!difficulty) return null
  const norm = difficulty.toLowerCase().trim()
  if (norm === 'facile' || norm === 'easy') return { key: 'facile', emoji: '🟢', label: 'Easy (Facile)' }
  if (norm === 'moyen' || norm === 'normal' || norm === 'medium') return { key: 'moyen', emoji: '🟡', label: 'Normal (Moyen)' }
  if (norm === 'difficile' || norm === 'hard') return { key: 'difficile', emoji: '🔴', label: 'Hard (Difficile)' }
  return { key: 'moyen', emoji: '⚪', label: difficulty }
}

export default function FlashGuess() {
  const { arenaId } = useParams<{ arenaId: string }>()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [answer, setAnswer] = useState('')
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    document.title = 'FlashGuess en direct — Smik Party'
  }, [])

  const {
    connected,
    selfId,
    isAdmin,
    isHost,
    myPlayer,
    players,
    roomStatus,
    settings,
    currentRound,
    totalRounds,
    isInfinite,
    timeLeft,
    roundMaxTime,
    isSpeedrun,
    currentQuestion,
    mutedQuestions,
    verifiedQuestions,
    askedQuestions,
    revealedAnswer,
    acceptedAnswers,
    answerFeedback,
    lastEarnedPoints,
    wasFirstAnswerer,
    leaderboard,
    podium,
    winner,
    chatMessages,
    actions,
  } = useArenaSocket({
    arenaId,
    onGameRestarted: () => navigate(`/arena/${arenaId}`),
  })

  // Autofocus input on each new round
  useEffect(() => {
    if (roomStatus === 'playing' && !myPlayer?.answeredCorrectly) {
      setAnswer('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [roomStatus, currentRound, myPlayer?.answeredCorrectly])

  // Reset image loading state cleanly whenever the question or its image changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [currentQuestion?.id, currentQuestion?.imageUrl])

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

  // Admin actions on end-game question list
  const handleVerifyQuestion = async (questionId: string | number) => {
    if (!isAdmin) return
    soundManager.playClick()
    const qId = String(questionId)
    actions.verifyQuestion(qId)

    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`${API_URL}/admin/questions/${encodeURIComponent(qId)}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      })
    } catch {
      // Offline / fallback handled by WebSocket & local state
    }
  }

  const handleSuspectQuestion = async (questionId: string | number) => {
    if (!isAdmin) return
    soundManager.playClick()
    const qId = String(questionId)
    actions.muteQuestion(qId, 'Question signalée comme suspecte en fin de partie')

    try {
      const token = localStorage.getItem('auth_token')
      await fetch(`${API_URL}/admin/questions/${encodeURIComponent(qId)}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: 'Question signalée comme suspecte en fin de partie' }),
      })
    } catch {
      // Offline / fallback handled by WebSocket & local state
    }
  }

  // Sorted players for real-time leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  // Timer visualization
  const maxTime = roundMaxTime || settings?.timePerRound || 20
  const timerPct = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100))
  const timerColor = isSpeedrun
    ? (timeLeft > maxTime * 0.5 ? '#f59e0b' : timeLeft > maxTime * 0.25 ? '#f97316' : '#ef4444')
    : (timeLeft > maxTime * 0.5
        ? 'var(--color-status-live)'
        : timeLeft > maxTime * 0.25
          ? 'var(--color-status-waiting)'
          : '#ef4444')

  // Final performance calculations
  const effectiveLeaderboard = leaderboard.length > 0 ? leaderboard : sortedPlayers
  const effectivePodium = podium.length > 0 ? podium : effectiveLeaderboard.slice(0, 3)
  const effectiveWinner = winner || effectiveLeaderboard[0] || null

  // Special distinction honors & top performers
  const topSpeedPlayer = [...effectiveLeaderboard].sort(
    (a, b) => (b.firstAnswersCount ?? 0) - (a.firstAnswersCount ?? 0)
  )[0]
  const bestStreakPlayer = [...effectiveLeaderboard].sort(
    (a, b) => (b.bestStreak ?? 0) - (a.bestStreak ?? 0)
  )[0]
  const topAccuracyPlayer = [...effectiveLeaderboard].sort(
    (a, b) => (b.correctAnswersCount ?? 0) - (a.correctAnswersCount ?? 0)
  )[0]

  // Personal player statistics
  const myLeaderboardRank = effectiveLeaderboard.findIndex(p => p.id === selfId) + 1
  const myTotalRounds = myPlayer?.totalAnswersCount || (isInfinite ? currentRound + 1 : totalRounds || 10)
  const myAccuracyRate = myTotalRounds > 0
    ? Math.round(((myPlayer?.correctAnswersCount ?? 0) / myTotalRounds) * 100)
    : 0

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
          <button
            type="button"
            className="fg-topbar-chat-btn"
            onClick={() => {
              soundManager.playClick()
              setIsChatOpen(prev => !prev)
            }}
            title="Ouvrir / Fermer le chat de l'arène"
            id="fg-topbar-toggle-chat"
          >
            <IconMessageCircle />
            <span>Chat</span>
          </button>
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
            {sortedPlayers.map((p) => {
              const isSelf = p.id === selfId
              const isAnswered = (roomStatus === 'playing' || roomStatus === 'reveal') && p.answeredCorrectly
              const isWrong = roomStatus === 'reveal' && !p.answeredCorrectly
              const hasStreak = p.streak >= 2
              const flameIntensity = hasStreak ? Math.min(1, 0.22 + (p.streak - 2) * 0.13) : 0
              const showAnswerTime = (roomStatus === 'playing' || roomStatus === 'reveal') && p.answeredCorrectly && p.answerTime != null
              return (
                <div
                  key={p.id}
                  style={hasStreak ? ({ '--flame-intensity': flameIntensity } as React.CSSProperties) : undefined}
                  className={[
                    'fg-player-card',
                    isSelf ? 'fg-player-card--self' : '',
                    isAnswered ? 'fg-player-card--answered' : '',
                    isWrong ? 'fg-player-card--wrong' : '',
                    hasStreak ? 'fg-player-card--streak' : '',
                    p.streak >= 5 ? 'fg-player-card--fire' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {hasStreak && (
                    <div className="fg-player-flames" aria-hidden="true">
                      <span className="fg-flame-glow" />
                      <span className="fg-flame-tongue fg-flame-tongue--1" />
                      <span className="fg-flame-tongue fg-flame-tongue--2" />
                      <span className="fg-flame-tongue fg-flame-tongue--3" />
                    </div>
                  )}
                  <div className="fg-player-avatar">
                    <IconUser />
                  </div>
                  <div className="fg-player-info">
                    <span className="fg-player-name">
                      <span className="fg-player-name-text">{p.name}</span>
                    </span>
                  </div>
                  <div className="fg-player-right">
                    <span className="fg-player-score">{p.score} pts</span>
                    {showAnswerTime && (
                      <span className="fg-player-time" title="Temps de réponse">
                        {p.answerTime!.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="fg-stats">
            <div className="fg-stat">
              <span className="fg-stat-label">Série</span>
              <span className="fg-stat-value">
                {myPlayer?.streak ?? 0} 🔥
                {myPlayer?.streak && myPlayer.streak >= 5 ? (
                  <span className="fg-stat-sub">(x2.0)</span>
                ) : myPlayer?.streak && myPlayer.streak >= 3 ? (
                  <span className="fg-stat-sub">(x1.5)</span>
                ) : null}
              </span>
            </div>
            <div className="fg-stat">
              <span className="fg-stat-label">1er (Top)</span>
              <span className="fg-stat-value fg-stat-value--first">
                ⚡ {myPlayer?.firstAnswersCount ?? 0}
              </span>
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
                  <span className={`fg-timer ${isSpeedrun ? 'fg-timer--speedrun' : ''}`} style={{ color: timerColor }}>
                    {isSpeedrun ? '⚡ ' : <IconClock />} {timeLeft}s
                  </span>
                </div>
                <div className="fg-timer-track">
                  <div
                    key={`${currentRound}-${currentQuestion.id}`}
                    className={`fg-timer-fill ${isSpeedrun ? 'fg-timer-fill--speedrun' : ''}`}
                    style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                  />
                </div>
              </div>

              {/* Question prompt: difficulty badge, question text, and image if present */}
              <div className={`fg-prompt ${roomStatus === 'reveal' ? 'fg-prompt--reveal' : ''}`}>
                {(() => {
                  const diffBadge = getDifficultyBadge(currentQuestion.difficulty)
                  return (diffBadge || isSpeedrun) ? (
                    <div className="fg-prompt-meta">
                      {diffBadge && (
                        <span className={`fg-difficulty-badge fg-difficulty-badge--${diffBadge.key}`}>
                          {diffBadge.emoji} {diffBadge.label}
                        </span>
                      )}
                      {isSpeedrun && (
                        <span className="fg-speedrun-badge">
                          ⚡ SPEEDRUN ({roundMaxTime ?? 5}s)
                        </span>
                      )}
                    </div>
                  ) : null
                })()}
                <p className="fg-prompt-text">{currentQuestion.text}</p>

                {currentQuestion.imageUrl && (
                  <div className="fg-question-image-wrapper">
                    {!imageLoaded && !imageError && (
                      <div className="fg-image-loading">
                        <div className="fg-spinner" style={{ width: 24, height: 24, margin: '0 auto 6px' }} />
                        <span>Chargement de l'image...</span>
                      </div>
                    )}
                    {imageError ? (
                      <div className="fg-image-loading">
                        <span>⚠️ Impossible de charger l'image</span>
                      </div>
                    ) : (
                      <img
                        key={`${currentQuestion.id}-${currentQuestion.imageUrl}`}
                        src={currentQuestion.imageUrl}
                        alt="Illustration de la question"
                        className="fg-question-image"
                        style={imageLoaded ? undefined : { display: 'none' }}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        onClick={() => {
                          soundManager.playClick()
                          setModalImage(currentQuestion.imageUrl ?? null)
                        }}
                        title="Cliquer pour agrandir"
                      />
                    )}
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
              </div>

              {/* Input Area */}
              {roomStatus === 'playing' && (
                myPlayer?.answeredCorrectly ? (
                  <div className="fg-answered-notice">
                    <IconCheck />
                    <span>
                      {wasFirstAnswerer ? '⚡ 1er à trouver ! ' : ''}
                      Bonne réponse trouvée ! (+{lastEarnedPoints} pts)
                      {myPlayer?.streak && myPlayer.streak > 1 ? ` • 🔥 Série x${myPlayer.streak}` : ''}
                      {' '}— En attente des autres joueurs...
                    </span>
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
                        {wasFirstAnswerer && <span className="fg-reveal-subtag">⚡ 1er</span>}
                        {myPlayer?.streak && myPlayer.streak > 1 && (
                          <span className="fg-reveal-subtag">🔥 Série x{myPlayer.streak}</span>
                        )}
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
            <div className="fg-results-card fade-in" style={{ maxWidth: 740, width: '100%' }}>
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

              {/* Trophées d'Honneur / Distinctions */}
              <div className="fg-awards-grid">
                {effectiveWinner && (
                  <div className="fg-award-card fg-award-card--gold">
                    <span className="fg-award-icon">👑</span>
                    <span className="fg-award-title">Champion</span>
                    <span className="fg-award-winner">{effectiveWinner.name}</span>
                    <span className="fg-award-detail">{effectiveWinner.score} pts</span>
                  </div>
                )}
                {topSpeedPlayer && (topSpeedPlayer.firstAnswersCount ?? 0) > 0 && (
                  <div className="fg-award-card fg-award-card--speed">
                    <span className="fg-award-icon">⚡</span>
                    <span className="fg-award-title">Le Plus Rapide</span>
                    <span className="fg-award-winner">{topSpeedPlayer.name}</span>
                    <span className="fg-award-detail">{topSpeedPlayer.firstAnswersCount}x en 1er</span>
                  </div>
                )}
                {bestStreakPlayer && (bestStreakPlayer.bestStreak ?? 0) > 1 && (
                  <div className="fg-award-card fg-award-card--streak">
                    <span className="fg-award-icon">🔥</span>
                    <span className="fg-award-title">Série Légendaire</span>
                    <span className="fg-award-winner">{bestStreakPlayer.name}</span>
                    <span className="fg-award-detail">{bestStreakPlayer.bestStreak} à la suite</span>
                  </div>
                )}
                {topAccuracyPlayer && (topAccuracyPlayer.correctAnswersCount ?? 0) > 0 && (
                  <div className="fg-award-card fg-award-card--accuracy">
                    <span className="fg-award-icon">🎯</span>
                    <span className="fg-award-title">Sniper Précision</span>
                    <span className="fg-award-winner">{topAccuracyPlayer.name}</span>
                    <span className="fg-award-detail">{topAccuracyPlayer.correctAnswersCount} réussies</span>
                  </div>
                )}
              </div>

              {/* Performance Metrics for Current Player */}
              <div className="fg-personal-stats">
                <h3 className="fg-section-subtitle">Vos Statistiques</h3>
                <div className="fg-metrics-grid">
                  <div className="fg-metric-card">
                    <span className="fg-metric-icon">
                      <IconTrophy />
                    </span>
                    <span className="fg-metric-label">Rang & Score</span>
                    <span className="fg-metric-val">
                      {myLeaderboardRank > 0 ? `#${myLeaderboardRank}` : '-'} • {myPlayer?.score ?? 0} pts
                    </span>
                  </div>
                  <div className="fg-metric-card">
                    <span className="fg-metric-icon">
                      <IconCheck />
                    </span>
                    <span className="fg-metric-label">Bonnes Réponses</span>
                    <span className="fg-metric-val">
                      {myPlayer?.correctAnswersCount ?? 0} / {myTotalRounds} ({myAccuracyRate}%)
                    </span>
                  </div>
                  <div className="fg-metric-card">
                    <span className="fg-metric-icon">
                      <IconZap />
                    </span>
                    <span className="fg-metric-label">1er à Répondre</span>
                    <span className="fg-metric-val" style={{ color: '#38bdf8' }}>
                      ⚡ {myPlayer?.firstAnswersCount ?? 0} fois
                    </span>
                  </div>
                  <div className="fg-metric-card">
                    <span className="fg-metric-icon">
                      <IconFlame />
                    </span>
                    <span className="fg-metric-label">Meilleure Série</span>
                    <span className="fg-metric-val" style={{ color: '#f97316' }}>
                      {myPlayer?.bestStreak ?? 0} 🔥
                    </span>
                  </div>
                  <div className="fg-metric-card">
                    <span className="fg-metric-icon">
                      <IconClock />
                    </span>
                    <span className="fg-metric-label">Temps Moyen</span>
                    <span className="fg-metric-val">
                      {myPlayer?.averageReactionTime ? `${myPlayer.averageReactionTime}s` : '-'}
                    </span>
                  </div>
                  <div className="fg-metric-card">
                    <span className="fg-metric-icon">
                      <IconTarget />
                    </span>
                    <span className="fg-metric-label">Série Finale</span>
                    <span className="fg-metric-val">
                      {myPlayer?.streak ?? 0} 🔥
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Multiplayer Leaderboard Table */}
              <div className="fg-leaderboard-container">
                <h3 className="fg-section-subtitle">Tableau Récapitulatif Complet</h3>
                <table className="fg-leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rang</th>
                      <th>Joueur</th>
                      <th>Score</th>
                      <th title="Nombre de questions trouvées">Bonnes rép.</th>
                      <th title="Nombre de fois premier à répondre correctement">⚡ 1er</th>
                      <th title="Meilleure série de réponses consécutives">🔥 Série Max</th>
                      <th title="Temps de réaction moyen sur les bonnes réponses">⏱️ Temps Moy.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveLeaderboard.map((p, idx) => (
                      <tr key={p.id} className={p.id === selfId ? 'fg-row-self' : ''}>
                        <td>{idx === 0 ? '🥇 1er' : idx === 1 ? '🥈 2e' : idx === 2 ? '🥉 3e' : `#${idx + 1}`}</td>
                        <td>
                          <strong>{p.name}</strong>
                          {p.id === selfId && <span className="ap-self-badge" style={{ marginLeft: 6 }}>Vous</span>}
                          {p.isHost && ' 👑'}
                        </td>
                        <td>
                          <strong style={{ color: idx === 0 ? '#facc15' : 'var(--color-text-primary)' }}>
                            {p.score} pts
                          </strong>
                        </td>
                        <td>{p.correctAnswersCount ?? 0}</td>
                        <td>
                          {(p.firstAnswersCount ?? 0) > 0 ? (
                            <span className="fg-table-speed-pill">⚡ {p.firstAnswersCount}</span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td>
                          {p.bestStreak > 0 ? (
                            <span className="fg-table-streak-pill">{p.bestStreak} 🔥</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {p.averageReactionTime ? `${p.averageReactionTime}s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Asked Questions Review List */}
              {askedQuestions.length > 0 && (
                <div className="fg-asked-questions">
                  <h3 className="fg-section-subtitle">Questions posées durant la partie</h3>
                  <div className="fg-asked-list">
                    {askedQuestions.map((q, idx) => {
                      const qId = String(q.id)
                      const isSuspect = Boolean(q.isMuted || mutedQuestions.includes(qId))
                      const isVerified = Boolean(q.isVerified || verifiedQuestions.includes(qId)) && !isSuspect
                      const diffBadge = getDifficultyBadge(q.difficulty)
                      return (
                        <div
                          key={`${qId}-${idx}`}
                          className={`fg-asked-card ${isVerified ? 'fg-asked-card--verified' : ''} ${isSuspect ? 'fg-asked-card--suspect' : ''}`}
                        >
                          <div className="fg-asked-main">
                            <div className="fg-asked-meta">
                              <span className="fg-asked-round">Manche #{q.round ?? idx + 1}</span>
                              {q.category && <span className="fg-asked-cat">{q.category}</span>}
                              {diffBadge && (
                                <span className={`fg-difficulty-badge fg-difficulty-badge--${diffBadge.key}`}>
                                  {diffBadge.emoji} {diffBadge.label}
                                </span>
                              )}
                              {isVerified && (
                                <span className="fg-asked-status fg-asked-status--verified">
                                  ✅ Vérifiée
                                </span>
                              )}
                              {isSuspect && (
                                <span className="fg-asked-status fg-asked-status--suspect">
                                  ⚠️ Suspecte
                                </span>
                              )}
                            </div>
                            <p className="fg-asked-text">{q.text}</p>
                            {q.answer && (
                              <p className="fg-asked-answer">
                                Réponse : <strong>{q.answer}</strong>
                              </p>
                            )}
                          </div>

                          {isAdmin && (
                            <div className="fg-asked-actions">
                              <button
                                type="button"
                                className={`fg-admin-verify-btn ${isVerified ? 'is-active' : ''}`}
                                onClick={() => handleVerifyQuestion(q.id)}
                                disabled={isVerified}
                                id={`btn-verify-question-${qId}`}
                              >
                                ✅ {isVerified ? 'Vérifiée' : 'Vérifier'}
                              </button>
                              <button
                                type="button"
                                className={`fg-admin-suspect-btn ${isSuspect ? 'is-active' : ''}`}
                                onClick={() => handleSuspectQuestion(q.id)}
                                disabled={isSuspect}
                                id={`btn-suspect-question-${qId}`}
                              >
                                ⚠️ {isSuspect ? 'Suspecte' : 'Suspect'}
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="fg-results-actions">
                {isHost && (
                  <button
                    className="fg-replay-btn"
                    onClick={() => {
                      soundManager.playClick()
                      actions.startGame()
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
                    actions.leaveArena()
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
      {/* Arena Chat Component */}
      <ArenaChat
        messages={chatMessages}
        onSendMessage={actions.sendChatMessage}
        selfId={selfId}
        selfName={myPlayer?.name || 'Vous'}
        isOpenExternal={isChatOpen}
        onToggleExternal={() => setIsChatOpen(prev => !prev)}
      />
    </div>
  )
}
