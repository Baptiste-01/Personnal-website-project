import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconGamepad, IconUser, IconCheck, IconClock,
  IconTrophy, IconShield, IconZap, IconInfinity, IconSettings,
  IconCopy, IconWifi, IconUsers, IconTarget,
} from '../../components/Icons'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../types'
import type { Category, Difficulty, GameSettings } from '../../types'
import './Arena.css'

/* ─── Constants ─── */
const ALL_CATEGORIES: Category[] = [
  'geographie', 'histoire', 'sciences', 'cinema',
  'musique', 'sport', 'litterature', 'gastronomie',
]

const CATEGORY_ICONS: Record<Category, string> = {
  geographie: '🌍', histoire: '📜', sciences: '🔬', cinema: '🎬',
  musique: '🎵', sport: '⚽', litterature: '📚', gastronomie: '🍽️',
}

const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60]
const ROUND_OPTIONS = [5, 10, 15, 20, 30]

/* ─── Mock players (replace with WebSocket state) ─── */
interface PlayerEntry {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  score: number
}

const MOCK_PLAYERS: PlayerEntry[] = [
  { id: 'p1', name: 'Vous', isHost: true, isReady: true, score: 0 },
  { id: 'p2', name: 'Alex_Pro', isHost: false, isReady: true, score: 0 },
  { id: 'p3', name: 'Marie42', isHost: false, isReady: false, score: 0 },
]

/* ─── Settings Tabs ─── */
type SettingTab = 'general' | 'timer' | 'categories' | 'points'

const TABS: { id: SettingTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Général', icon: <IconSettings /> },
  { id: 'categories', label: 'Catégories', icon: <IconTarget /> },
  { id: 'timer', label: 'Chrono', icon: <IconClock /> },
  { id: 'points', label: 'Points', icon: <IconTrophy /> },
]

/* ─── Player Card ─── */
function PlayerCard({ player, index }: { player: PlayerEntry; index: number }) {
  return (
    <div
      className={`ap-card ${player.isHost ? 'ap-card--host' : ''} ${player.isReady ? 'ap-card--ready' : 'ap-card--waiting'}`}
      id={`player-card-${player.id}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="ap-avatar">
        <IconUser />
        {player.isHost && (
          <span className="ap-crown" title="Hôte">👑</span>
        )}
      </div>
      <div className="ap-info">
        <span className="ap-name">
          {player.name}
          {player.isHost && <span className="ap-host-badge">Hôte</span>}
        </span>
        <span className={`ap-status ${player.isReady ? 'ap-status--ready' : 'ap-status--wait'}`}>
          {player.isReady ? 'Prêt' : 'En attente...'}
        </span>
      </div>
      <div className={`ap-ready-icon ${player.isReady ? 'ap-ready-icon--yes' : 'ap-ready-icon--no'}`}>
        {player.isReady ? <IconCheck /> : <span className="ap-dots">•••</span>}
      </div>
    </div>
  )
}

/* ─── Toggle Switch ─── */
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      className={`toggle-switch ${checked ? 'toggle-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

/* ─── Main Arena ─── */
export default function Arena() {
  const { arenaId } = useParams<{ arenaId: string }>()
  const navigate = useNavigate()
  const [arenaName, setArenaName] = useState('Chargement...')
  const players = MOCK_PLAYERS
  const [activeTab, setActiveTab] = useState<SettingTab>('general')
  const [copied, setCopied] = useState(false)

  const [settings, setSettings] = useState<GameSettings>({
    categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique'],
    difficulty: 'facile',
    roundCount: 10,
    timePerRound: 20,
    maxPoints: 1000,
    infiniteRounds: false,
    pointsPerAnswer: 100,
  })

  /* ─── Derived: min points (at end of timer) = 10% of pointsPerAnswer ─── */
  const minPointsPerAnswer = Math.max(1, Math.round(settings.pointsPerAnswer * 0.1))

  useEffect(() => {
    fetch(`http://localhost:3000/arenas/${arenaId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setArenaName(data.name) })
      .catch(() => setArenaName('Mon Arène'))
  }, [arenaId])

  const toggleCategory = (cat: Category) => {
    setSettings(prev => {
      const has = prev.categories.includes(cat)
      if (has && prev.categories.length === 1) return prev
      return { ...prev, categories: has ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] }
    })
  }

  const startGame = useCallback(() => {
    const params = new URLSearchParams({
      categories: settings.categories.join(','),
      difficulty: settings.difficulty,
      rounds: settings.infiniteRounds ? 'infinite' : String(settings.roundCount),
      time: String(settings.timePerRound),
      maxPoints: String(settings.maxPoints),
      infiniteRounds: String(settings.infiniteRounds),
      pointsPerAnswer: String(settings.pointsPerAnswer),
    })
    navigate(`/play/${arenaId}?${params.toString()}`)
  }, [settings, arenaId, navigate])

  const copyInviteLink = () => {
    const link = `${window.location.origin}/arena/${arenaId}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const readyCount = players.filter(p => p.isReady).length

  return (
    <div className="arena" id="arena-page">
      {/* Ambient orbs */}
      <div className="arena-orb arena-orb--1" />
      <div className="arena-orb arena-orb--2" />

      {/* ─── Topbar ─── */}
      <header className="arena-topbar">
        <button className="arena-back" onClick={() => navigate('/')} id="back-to-lobby">
          <IconArrowLeft /><span>Lobby</span>
        </button>

        <div className="arena-topbar-center">
          <div className="arena-topbar-icon"><IconGamepad /></div>
          <h1 className="arena-topbar-title">{arenaName}</h1>
          <span className="arena-id-badge">#{arenaId?.slice(0, 6)}</span>
        </div>

        <div className="arena-topbar-right">
          <div className="arena-online-badge">
            <IconWifi />
            <span>{players.length} connecté{players.length > 1 ? 's' : ''}</span>
          </div>
          <button
            className={`arena-invite-btn ${copied ? 'arena-invite-btn--copied' : ''}`}
            onClick={copyInviteLink}
            id="copy-invite-link"
          >
            <IconCopy />
            {copied ? 'Copié !' : 'Inviter'}
          </button>
        </div>
      </header>

      <div className="arena-layout">
        {/* ─── Player Sidebar ─── */}
        <aside className="arena-sidebar" id="arena-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title-row">
              <IconUsers />
              <h2 className="sidebar-title">Joueurs</h2>
            </div>
            <div className="sidebar-count-badge">
              <span className="sidebar-count-num">{players.length}</span>
              <span className="sidebar-count-sep">/</span>
              <span className="sidebar-count-max">8</span>
            </div>
          </div>

          {/* Ready progress */}
          <div className="ready-progress" id="ready-progress">
            <div className="ready-progress-bar">
              <div
                className="ready-progress-fill"
                style={{ width: `${(readyCount / players.length) * 100}%` }}
              />
            </div>
            <span className="ready-progress-label">
              {readyCount}/{players.length} prêts
            </span>
          </div>

          <div className="arena-player-list" id="arena-player-list">
            {players.map((p, i) => (
              <PlayerCard key={p.id} player={p} index={i} />
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 3 - players.length) }).map((_, i) => (
              <div key={`slot-${i}`} className="ap-slot">
                <div className="ap-slot-icon"><IconUser /></div>
                <span className="ap-slot-label">En attente...</span>
              </div>
            ))}
          </div>

          {/* Invite section */}
          <div className="sidebar-invite">
            <p className="sidebar-invite-label">Lien d'invitation</p>
            <div className="sidebar-invite-box">
              <span className="sidebar-invite-code">{arenaId?.slice(0, 8)}...</span>
              <button
                className={`sidebar-invite-copy ${copied ? 'sidebar-invite-copy--done' : ''}`}
                onClick={copyInviteLink}
                id="sidebar-copy-link"
              >
                <IconCopy />
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Main Settings Panel ─── */}
        <main className="arena-main" id="arena-main">
          <div className="settings-panel fade-in">

            {/* Panel header */}
            <div className="settings-panel-head">
              <div>
                <h2 className="settings-title">Configuration de la partie</h2>
                <p className="settings-subtitle">Personnalisez les règles avant de lancer FlashGuess.</p>
              </div>
              <div className="settings-summary">
                <div className="summary-chip summary-chip--diff">
                  <IconShield />
                  {DIFFICULTY_LABELS[settings.difficulty]}
                </div>
                <div className="summary-chip summary-chip--rounds">
                  {settings.infiniteRounds ? <IconInfinity /> : <IconZap />}
                  {settings.infiniteRounds ? '∞ manches' : `${settings.roundCount} manches`}
                </div>
                <div className="summary-chip summary-chip--pts">
                  <IconTrophy />
                  {settings.maxPoints} pts max
                </div>
              </div>
            </div>

            {/* Tab bar */}
            <div className="settings-tabs" id="settings-tabs" role="tablist">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`settings-tab ${activeTab === tab.id ? 'settings-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ── Tab: Général ── */}
            {activeTab === 'general' && (
              <div className="tab-content fade-in" id="tab-content-general">
                <div className="settings-section">
                  <h3 className="settings-label">
                    <IconShield /> Difficulté
                  </h3>
                  <div className="difficulty-options">
                    {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => (
                      <button
                        key={d}
                        className={`difficulty-btn ${settings.difficulty === d ? 'difficulty-btn--active' : ''}`}
                        onClick={() => setSettings(prev => ({ ...prev, difficulty: d }))}
                        id={`difficulty-${d}`}
                      >
                        <span className="diff-emoji">
                          {d === 'facile' ? '🟢' : d === 'moyen' ? '🟡' : '🔴'}
                        </span>
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-section">
                  <h3 className="settings-label">
                    <IconUsers /> Joueurs max
                  </h3>
                  <div className="option-pills">
                    {[2, 4, 6, 8, 10].map(n => (
                      <button
                        key={n}
                        className={`option-pill`}
                        id={`max-players-${n}`}
                        onClick={() => {}} /* TODO: wire to arena state */
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Catégories ── */}
            {activeTab === 'categories' && (
              <div className="tab-content fade-in" id="tab-content-categories">
                <div className="settings-section">
                  <div className="settings-label-row">
                    <h3 className="settings-label"><IconTarget /> Catégories de questions</h3>
                    <span className="settings-label-count">
                      {settings.categories.length}/{ALL_CATEGORIES.length} sélectionnées
                    </span>
                  </div>
                  <div className="category-grid">
                    {ALL_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        className={`category-chip ${settings.categories.includes(cat) ? 'category-chip--active' : ''}`}
                        onClick={() => toggleCategory(cat)}
                        id={`category-${cat}`}
                      >
                        <span className="category-emoji">{CATEGORY_ICONS[cat]}</span>
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                  <p className="settings-hint">Au moins 1 catégorie requise.</p>
                </div>
              </div>
            )}

            {/* ── Tab: Chrono ── */}
            {activeTab === 'timer' && (
              <div className="tab-content fade-in" id="tab-content-timer">

                {/* Infinite Rounds toggle */}
                <div className="settings-section">
                  <div className="settings-row-between">
                    <div>
                      <h3 className="settings-label"><IconInfinity /> Manches infinies</h3>
                      <p className="settings-hint">
                        La partie ne s'arrête que lorsqu'un joueur atteint le score maximum.
                      </p>
                    </div>
                    <Toggle
                      id="toggle-infinite"
                      checked={settings.infiniteRounds}
                      onChange={v => setSettings(prev => ({ ...prev, infiniteRounds: v }))}
                    />
                  </div>

                  {settings.infiniteRounds && (
                    <div className="infinite-info-banner fade-in">
                      <IconInfinity />
                      <span>Mode infini activé — victoire au premier à <strong>{settings.maxPoints} pts</strong></span>
                    </div>
                  )}
                </div>

                {/* Round count (only shown when not infinite) */}
                {!settings.infiniteRounds && (
                  <div className="settings-section fade-in">
                    <h3 className="settings-label"><IconZap /> Nombre de manches</h3>
                    <div className="option-pills">
                      {ROUND_OPTIONS.map(n => (
                        <button
                          key={n}
                          className={`option-pill ${settings.roundCount === n ? 'option-pill--active' : ''}`}
                          onClick={() => setSettings(prev => ({ ...prev, roundCount: n }))}
                          id={`rounds-${n}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time per round */}
                <div className="settings-section">
                  <h3 className="settings-label"><IconClock /> Temps par question</h3>
                  <div className="option-pills option-pills--wrap">
                    {TIME_OPTIONS.map(t => (
                      <button
                        key={t}
                        className={`option-pill ${settings.timePerRound === t ? 'option-pill--active' : ''}`}
                        onClick={() => setSettings(prev => ({ ...prev, timePerRound: t }))}
                        id={`time-${t}`}
                      >
                        <IconClock /> {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Points ── */}
            {activeTab === 'points' && (
              <div className="tab-content fade-in" id="tab-content-points">

                {/* ── Max Points input ── */}
                <div className="settings-section">
                  <h3 className="settings-label"><IconTrophy /> Score maximum</h3>
                  <p className="settings-hint">
                    {settings.infiniteRounds
                      ? 'Le premier joueur à atteindre ce score remporte la partie.'
                      : 'Score total maximum atteignable sur toute la partie.'}
                  </p>
                  <div className="pts-input-row">
                    <div className="pts-input-group">
                      <input
                        id="input-max-points"
                        type="number"
                        min={100}
                        max={99999}
                        step={50}
                        value={settings.maxPoints}
                        onChange={e => {
                          const v = Math.max(100, Math.min(99999, Number(e.target.value) || 100))
                          setSettings(prev => ({ ...prev, maxPoints: v }))
                        }}
                        className="pts-input"
                      />
                      <span className="pts-input-unit">pts</span>
                    </div>
                    <div className="pts-presets">
                      {[500, 1000, 2000, 5000].map(p => (
                        <button
                          key={p}
                          className={`pts-preset-btn ${settings.maxPoints === p ? 'pts-preset-btn--active' : ''}`}
                          onClick={() => setSettings(prev => ({ ...prev, maxPoints: p }))}
                          id={`maxpts-${p}`}
                        >
                          {p >= 1000 ? `${p / 1000}k` : p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Points per correct answer input ── */}
                <div className="settings-section">
                  <h3 className="settings-label"><IconZap /> Points par bonne réponse</h3>
                  <p className="settings-hint">
                    Le <strong>1er joueur à trouver</strong> reçoit ce montant en entier.
                    Les joueurs suivants reçoivent moins — proportionnellement au délai après la 1ère réponse.
                  </p>
                  <div className="pts-input-row">
                    <div className="pts-input-group">
                      <input
                        id="input-points-per-answer"
                        type="number"
                        min={10}
                        max={10000}
                        step={10}
                        value={settings.pointsPerAnswer}
                        onChange={e => {
                          const v = Math.max(10, Math.min(10000, Number(e.target.value) || 10))
                          setSettings(prev => ({ ...prev, pointsPerAnswer: v }))
                        }}
                        className="pts-input"
                      />
                      <span className="pts-input-unit">pts</span>
                    </div>
                    <div className="pts-presets">
                      {[50, 100, 200, 500].map(p => (
                        <button
                          key={p}
                          className={`pts-preset-btn ${settings.pointsPerAnswer === p ? 'pts-preset-btn--active' : ''}`}
                          onClick={() => setSettings(prev => ({ ...prev, pointsPerAnswer: p }))}
                          id={`ppa-${p}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Relative-decay preview ── */}
                <div className="points-preview">
                  <div className="points-preview-title">Décroissance relative à la 1ère réponse</div>
                  <p className="pts-decay-desc">
                    Dès que le 1er joueur répond, un chrono relatif démarre.
                    Plus un joueur met du temps <em>après lui</em>, moins il gagne de points.
                    Répondre en même temps = score identique.
                  </p>

                  {/* Players-in-a-race visualisation */}
                  <div className="pts-race-wrap" id="pts-race-wrap">

                    {/* Header row */}
                    <div className="pts-race-header">
                      <span className="pts-race-header-left">
                        <span className="pts-race-axis-label">← Même moment que le 1er</span>
                      </span>
                      <span className="pts-race-axis-label pts-race-axis-right">Répond plus tard →</span>
                    </div>

                    {/* Decay bar */}
                    <div className="pts-decay-bar" style={{ marginBottom: 36 }}>
                      <div className="pts-decay-gradient" />
                      {[0, 0.25, 0.5, 0.75, 1].map(t => {
                        const pts = Math.round(
                          settings.pointsPerAnswer - (settings.pointsPerAnswer - minPointsPerAnswer) * t
                        )
                        const delaySec = Math.round(settings.timePerRound * t)
                        return (
                          <div key={t} className="pts-decay-marker" style={{ left: `${t * 100}%` }}>
                            <div className="pts-decay-dot" />
                            <div className="pts-decay-marker-pts">+{pts}</div>
                            <div className="pts-decay-marker-time">
                              {t === 0 ? '0s après' : `+${delaySec}s`}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="pts-decay-labels">
                      <span>Simultané au 1er joueur</span>
                      <span>Juste avant la fin du chrono</span>
                    </div>
                  </div>

                  {/* Breakdown table – "example race" with 4 fake players */}
                  <div className="pts-breakdown">
                    <div className="pts-breakdown-row pts-breakdown-row--head">
                      <span>Joueur</span>
                      <span>Délai après le 1er</span>
                      <span>Points</span>
                    </div>

                    {[
                      { label: '🥇 Joueur 1', t: 0,    badge: '1er à répondre', isFirst: true  },
                      { label: '🥈 Joueur 2', t: 0.25, badge: null,             isFirst: false },
                      { label: '🥉 Joueur 3', t: 0.55, badge: null,             isFirst: false },
                      { label: '4️⃣  Joueur 4', t: 0.9,  badge: null,             isFirst: false },
                    ].map(({ label, t, isFirst }) => {
                      const delaySec = Math.round(settings.timePerRound * t)
                      const pts = Math.round(
                        settings.pointsPerAnswer - (settings.pointsPerAnswer - minPointsPerAnswer) * t
                      )
                      return (
                        <div
                          key={label}
                          className={`pts-breakdown-row pts-breakdown-row--3col ${isFirst ? 'pts-breakdown-row--first' : ''}`}
                        >
                          <span className="pts-bd-time">{label}</span>
                          <span className="pts-bd-delay">
                            {isFirst
                              ? <span className="pts-bd-badge">⚡ Instantané</span>
                              : `+${delaySec}s après`}
                          </span>
                          <span className="pts-bd-pts">
                            +{pts.toLocaleString('fr-FR')} pts
                            {isFirst && <span className="pts-bd-star">★ max</span>}
                          </span>
                        </div>
                      )
                    })}

                    <div className="pts-breakdown-row pts-breakdown-row--3col pts-breakdown-row--min">
                      <span className="pts-bd-time">Minimum garanti</span>
                      <span className="pts-bd-delay">peu importe le délai</span>
                      <span className="pts-bd-pts">+{minPointsPerAnswer} pts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* ─── Start Button ─── */}
            <div className="settings-footer">
              <div className="settings-footer-info">
                <span className="footer-info-chip">
                  {settings.infiniteRounds ? <IconInfinity /> : <IconZap />}
                  {settings.infiniteRounds ? 'Infini' : `${settings.roundCount} manches`}
                </span>
                <span className="footer-info-chip">
                  <IconClock /> {settings.timePerRound}s/question
                </span>
                <span className="footer-info-chip">
                  <IconTrophy /> {settings.maxPoints.toLocaleString('fr-FR')} pts max
                </span>
              </div>
              <button
                className="btn-start-game"
                onClick={startGame}
                id="start-game"
                disabled={readyCount < 1}
              >
                <IconZap />
                Lancer la partie
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
