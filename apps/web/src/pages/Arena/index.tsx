import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconArrowLeft, IconGamepad, IconUser, IconCheck, IconClock,
  IconTrophy, IconShield, IconZap, IconInfinity, IconSettings,
  IconCopy, IconWifi, IconUsers, IconTarget, IconTrash,
} from '../../components/Icons'
import {
  DIFFICULTY_LABELS, DEFAULT_CATEGORIES, DEFAULT_CATEGORY_DIFFICULTIES,
  getCategoryLabel, getCategoryIcon
} from '../../types'
import type { Category, Difficulty, GameSettings } from '../../types'
import { useArenaSocket } from '../../hooks/useArenaSocket'
import { useCategories } from '../../hooks/useCategories'
import './Arena.css'

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
function Toggle({ checked, onChange, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; id: string; disabled?: boolean }) {
  return (
    <button
      id={id}
      disabled={disabled}
      role="switch"
      aria-checked={checked}
      className={`toggle-switch ${checked ? 'toggle-switch--on' : ''}`}
      onClick={() => { if (!disabled) onChange(!checked) }}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

/* ─── Main Arena ─── */
export default function Arena() {
  const { arenaId } = useParams<{ arenaId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { categories: availableCategories } = useCategories()
  const [arenaName, setArenaName] = useState('Chargement...')
  const [activeTab, setActiveTab] = useState<SettingTab>('general')
  const [copied, setCopied] = useState(false)

  const [settings, setSettings] = useState<GameSettings>(() => {
    const diff = searchParams.get('difficulty') as Difficulty | null
    const inf = searchParams.get('infiniteRounds')
    const rounds = searchParams.get('rounds')
    const time = searchParams.get('time')
    const maxPts = searchParams.get('maxPoints')
    const catDiffsStr = searchParams.get('catDiffs')
    const catsParam = searchParams.get('categories')

    const initialCatDiffs: Record<string, Difficulty[]> = { ...DEFAULT_CATEGORY_DIFFICULTIES }
    if (catDiffsStr) {
      catDiffsStr.split(',').forEach(p => {
        const [c, dStr] = p.split(':')
        if (c && dStr) {
          const diffs = dStr.split('+').filter(Boolean) as Difficulty[]
          if (diffs.length > 0) initialCatDiffs[c] = diffs
        }
      })
    }

    return {
      categories: catsParam ? catsParam.split(',').filter(Boolean) : [...DEFAULT_CATEGORIES],
      difficulty: diff ?? 'facile',
      difficulties: ['facile', 'moyen', 'difficile'],
      categoryDifficulties: initialCatDiffs,
      roundCount: rounds && rounds !== 'infinite' ? Number(rounds) : 10,
      timePerRound: time ? Number(time) : 20,
      maxPoints: maxPts ? Number(maxPts) : 1000,
      infiniteRounds: inf === 'true' || rounds === 'infinite',
      pointsPerAnswer: 100,
    }
  })

  // WebSocket hook
  const socket = useArenaSocket(arenaId, settings)
  // Lit le pseudo depuis le bon endroit selon que l'utilisateur est connecté ou invité
  const currentUsername = (() => {
    try {
      const authUser = localStorage.getItem('auth_user')
      if (authUser) {
        const u = JSON.parse(authUser)
        if (u.username) return u.username
      }
    } catch {}
    return localStorage.getItem('guest_username') || 'Joueur Anonyme'
  })()

  const players = socket.players.length > 0 ? socket.players : [
    { id: 'self', name: currentUsername, isHost: true, isReady: true, score: 0, streak: 0, hasAnsweredCurrentRound: false }
  ]

  // Sync settings from server for guest players
  useEffect(() => {
    if (!socket.isHost && socket.settings && Object.keys(socket.settings).length > 0) {
      setSettings(prev => ({
        ...prev,
        ...socket.settings,
        categoryDifficulties: socket.settings.categoryDifficulties || prev.categoryDifficulties,
      }))
    }
  }, [socket.settings, socket.isHost])

  // Auto-navigate to FlashGuess when host starts game
  useEffect(() => {
    if (socket.phase === 'playing') {
      const effectiveSettings = socket.settings && Object.keys(socket.settings).length > 0
        ? { ...settings, ...socket.settings }
        : settings

      const catDiffsStr = Object.entries(effectiveSettings.categoryDifficulties || {})
        .filter(([cat]) => (effectiveSettings.categories || []).includes(cat as Category))
        .map(([cat, diffs]) => `${cat}:${(diffs ?? []).join('+')}`)
        .join(',')

      const params = new URLSearchParams({
        categories: (effectiveSettings.categories || []).join(','),
        difficulty: effectiveSettings.difficulty || 'facile',
        rounds: effectiveSettings.infiniteRounds ? 'infinite' : String(effectiveSettings.roundCount || 10),
        time: String(effectiveSettings.timePerRound || 20),
        maxPoints: String(effectiveSettings.maxPoints || 1000),
        infiniteRounds: String(effectiveSettings.infiniteRounds || false),
        pointsPerAnswer: String(effectiveSettings.pointsPerAnswer || 100),
        catDiffs: catDiffsStr,
      })
      navigate(`/play/${arenaId}?${params.toString()}`, { state: { questions: socket.questions } })
    }
  }, [socket.phase, socket.questions, socket.settings, arenaId, settings, navigate])

  // Redirect to lobby if arena is deleted by host
  useEffect(() => {
    if (socket.arenaDeleted) {
      navigate('/')
    }
  }, [socket.arenaDeleted, navigate])

  useEffect(() => {
    fetch(`/arenas/${arenaId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setArenaName(data.name) })
      .catch(() => setArenaName('Mon Arène'))
  }, [arenaId])

  const isHostDisabled = !socket.isHost && socket.players.length > 1

  const updateGameSettings = (updater: Partial<GameSettings> | ((prev: GameSettings) => GameSettings)) => {
    if (isHostDisabled) return
    setSettings(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      if (socket.isHost || socket.players.length <= 1) {
        socket.updateSettings(updated)
      }
      return updated
    })
  }

  const toggleCategory = (cat: Category) => {
    if (isHostDisabled) return
    updateGameSettings(prev => {
      const has = prev.categories.includes(cat)
      if (has && prev.categories.length === 1) return prev
      return { ...prev, categories: has ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] }
    })
  }

  const toggleCategoryDifficulty = (cat: Category, diff: Difficulty) => {
    if (isHostDisabled) return

    const currentDiffs = settings.categoryDifficulties?.[cat] || ['facile', 'moyen', 'difficile']
    let nextDiffs: Difficulty[]

    if (currentDiffs.includes(diff)) {
      // Don't remove if it's the only selected difficulty
      if (currentDiffs.length === 1) return
      nextDiffs = currentDiffs.filter(d => d !== diff)
    } else {
      nextDiffs = [...currentDiffs, diff]
    }

    updateGameSettings(prev => ({
      ...prev,
      categoryDifficulties: {
        ...(prev.categoryDifficulties || {}),
        [cat]: nextDiffs,
      },
    }))
  }

  const toggleAllCategoryDifficulties = (cat: Category) => {
    if (isHostDisabled) return
    const currentDiffs = settings.categoryDifficulties?.[cat] || []
    const nextDiffs: Difficulty[] = currentDiffs.length === 3 ? ['facile'] : ['facile', 'moyen', 'difficile']
    updateGameSettings(prev => ({
      ...prev,
      categoryDifficulties: {
        ...(prev.categoryDifficulties || {}),
        [cat]: nextDiffs,
      },
    }))
  }

  const setAllCategoriesDifficulty = (diff: Difficulty | 'mixte') => {
    if (isHostDisabled) return
    const diffList: Difficulty[] = diff === 'mixte'
      ? ['facile', 'moyen', 'difficile']
      : [diff]

    const updatedCatDiffs: Record<string, Difficulty[]> = { ...(settings.categoryDifficulties || {}) }
    availableCategories.forEach(cat => {
      updatedCatDiffs[cat] = diffList
    })

    updateGameSettings(prev => ({
      ...prev,
      categoryDifficulties: updatedCatDiffs,
    }))
  }



  const handleStartGame = useCallback(() => {
    if (socket.isHost || socket.players.length <= 1) {
      socket.startGame()

      // Fallback navigation if WS is disconnected or slow
      setTimeout(() => {
        if (socket.phase !== 'playing') {
          const catDiffsStr = Object.entries(settings.categoryDifficulties)
            .filter(([cat]) => settings.categories.includes(cat as Category))
            .map(([cat, diffs]) => `${cat}:${(diffs ?? []).join('+')}`)
            .join(',')

          const params = new URLSearchParams({
            categories: settings.categories.join(','),
            difficulty: settings.difficulty,
            rounds: settings.infiniteRounds ? 'infinite' : String(settings.roundCount),
            time: String(settings.timePerRound),
            maxPoints: String(settings.maxPoints),
            infiniteRounds: String(settings.infiniteRounds),
            pointsPerAnswer: String(settings.pointsPerAnswer),
            catDiffs: catDiffsStr,
          })
          navigate(`/play/${arenaId}?${params.toString()}`)
        }
      }, 400)
    } else {
      socket.toggleReady()
    }
  }, [socket, settings, arenaId, navigate])

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

            {isHostDisabled && (
              <div className="host-managed-banner fade-in">
                🔒 Seul l'hôte de la salle peut modifier les règles de la partie.
              </div>
            )}

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
                        disabled={isHostDisabled}
                        className={`difficulty-btn ${settings.difficulty === d ? 'difficulty-btn--active' : ''}`}
                        onClick={() => updateGameSettings({ difficulty: d })}
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
                        disabled={isHostDisabled}
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
                    <h3 className="settings-label"><IconTarget /> Catégories actives</h3>
                    <span className="settings-label-count">
                      {settings.categories.length}/{availableCategories.length} sélectionnées
                    </span>
                  </div>

                  <div className="category-grid">
                    {availableCategories.map(cat => {
                      const isSelected = settings.categories.includes(cat)
                      return (
                        <button
                          key={cat}
                          type="button"
                          disabled={isHostDisabled}
                          className={`category-chip ${isSelected ? 'category-chip--active' : ''}`}
                          onClick={() => toggleCategory(cat)}
                        >
                          <span className="category-emoji">{getCategoryIcon(cat)}</span>
                          <span>{getCategoryLabel(cat)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="settings-hint">Sélectionnez au moins 1 catégorie pour générer les questions de la partie.</p>
                </div>

                {/* ── Per-Category Difficulty Section ── */}
                <div className="settings-section" style={{ marginTop: '1.25rem' }}>
                  <div className="settings-label-row">
                    <h3 className="settings-label"><IconShield /> Difficulté par catégorie</h3>
                  </div>

                  {/* Quick Preset bar */}
                  <div className="quick-diff-preset-bar">
                    <span className="quick-diff-label">Appliquer à toutes :</span>
                    <button
                      type="button"
                      disabled={isHostDisabled}
                      className="cat-diff-pill diff--facile"
                      onClick={() => setAllCategoriesDifficulty('facile')}
                    >
                      🟢 Facile
                    </button>
                    <button
                      type="button"
                      disabled={isHostDisabled}
                      className="cat-diff-pill diff--moyen"
                      onClick={() => setAllCategoriesDifficulty('moyen')}
                    >
                      🟡 Moyen
                    </button>
                    <button
                      type="button"
                      disabled={isHostDisabled}
                      className="cat-diff-pill diff--difficile"
                      onClick={() => setAllCategoriesDifficulty('difficile')}
                    >
                      🔴 Difficile
                    </button>
                    <button
                      type="button"
                      disabled={isHostDisabled}
                      className="cat-diff-pill diff--mixte"
                      onClick={() => setAllCategoriesDifficulty('mixte')}
                    >
                      ✨ Mixte
                    </button>
                  </div>

                  {/* List of active categories with their difficulty pickers */}
                  <div className="category-diff-list">
                    {availableCategories.filter(cat => settings.categories.includes(cat)).map(cat => {
                      const currentDiffs = settings.categoryDifficulties?.[cat] || ['facile', 'moyen', 'difficile']
                      const isAllSelected = currentDiffs.length === 3

                      return (
                        <div key={cat} className="category-card category-card--active fade-in">
                          <div className="category-card-header">
                            <div className="category-card-title-group">
                              <span className="category-emoji">{getCategoryIcon(cat)}</span>
                              <span className="category-card-name">{getCategoryLabel(cat)}</span>
                            </div>
                            <span className="category-diff-badge-count">
                              {currentDiffs.length === 3 ? '✨ 3/3 niveaux' : `${currentDiffs.length}/3 niveau${currentDiffs.length > 1 ? 'x' : ''}`}
                            </span>
                          </div>
                          <div className="category-card-diff-pills">
                            {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => {
                              const isActive = currentDiffs.includes(d)
                              const emoji = d === 'facile' ? '🟢' : d === 'moyen' ? '🟡' : '🔴'
                              const label = d === 'facile' ? 'Facile' : d === 'moyen' ? 'Moyen' : 'Difficile'
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  disabled={isHostDisabled}
                                  className={`cat-diff-pill ${isActive ? `cat-diff-pill--active diff--${d}` : ''}`}
                                  onClick={() => toggleCategoryDifficulty(cat, d)}
                                  title={`${isActive ? 'Désactiver' : 'Activer'} ${label}`}
                                >
                                  {emoji} {label}
                                </button>
                              )
                            })}
                            <button
                              type="button"
                              disabled={isHostDisabled}
                              className={`cat-diff-pill ${isAllSelected ? 'cat-diff-pill--active diff--mixte' : ''}`}
                              onClick={() => toggleAllCategoryDifficulties(cat)}
                              title="Activer/Désactiver tous les niveaux"
                            >
                              ✨ Tous
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
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
                      disabled={isHostDisabled}
                      checked={settings.infiniteRounds}
                      onChange={v => updateGameSettings({ infiniteRounds: v })}
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
                          disabled={isHostDisabled}
                          className={`option-pill ${settings.roundCount === n ? 'option-pill--active' : ''}`}
                          onClick={() => updateGameSettings({ roundCount: n })}
                          id={`rounds-${n}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="slider-control-group">
                      <div className="slider-input-row">
                        <input
                          type="range"
                          disabled={isHostDisabled}
                          min={1}
                          max={50}
                          step={1}
                          value={settings.roundCount}
                          onChange={e => updateGameSettings({ roundCount: Number(e.target.value) })}
                          className="settings-range-slider"
                          id="rounds-slider"
                        />
                        <span className="slider-val-badge">{settings.roundCount} manche{settings.roundCount > 1 ? 's' : ''}</span>
                      </div>
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
                        disabled={isHostDisabled}
                        className={`option-pill ${settings.timePerRound === t ? 'option-pill--active' : ''}`}
                        onClick={() => updateGameSettings({ timePerRound: t })}
                        id={`time-${t}`}
                      >
                        <IconClock /> {t}s
                      </button>
                    ))}
                  </div>
                  <div className="slider-control-group">
                    <div className="slider-input-row">
                      <input
                        type="range"
                        disabled={isHostDisabled}
                        min={5}
                        max={120}
                        step={1}
                        value={settings.timePerRound}
                        onChange={e => updateGameSettings({ timePerRound: Number(e.target.value) })}
                        className="settings-range-slider"
                        id="time-slider"
                      />
                      <span className="slider-val-badge">{settings.timePerRound}s</span>
                    </div>
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
                        disabled={isHostDisabled}
                        min={100}
                        max={99999}
                        step={50}
                        value={settings.maxPoints}
                        onChange={e => {
                          const v = Math.max(100, Math.min(99999, Number(e.target.value) || 100))
                          updateGameSettings({ maxPoints: v })
                        }}
                        className="pts-input"
                      />
                      <span className="pts-input-unit">pts</span>
                    </div>
                    <div className="pts-presets">
                      {[500, 1000, 2000, 5000].map(p => (
                        <button
                          key={p}
                          disabled={isHostDisabled}
                          className={`pts-preset-btn ${settings.maxPoints === p ? 'pts-preset-btn--active' : ''}`}
                          onClick={() => updateGameSettings({ maxPoints: p })}
                          id={`maxpts-${p}`}
                        >
                          {p >= 1000 ? `${p / 1000}k` : p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="slider-control-group">
                    <div className="slider-input-row">
                      <input
                        type="range"
                        disabled={isHostDisabled}
                        min={100}
                        max={10000}
                        step={50}
                        value={settings.maxPoints}
                        onChange={e => updateGameSettings({ maxPoints: Number(e.target.value) })}
                        className="settings-range-slider"
                        id="maxpts-slider"
                      />
                      <span className="slider-val-badge">{settings.maxPoints.toLocaleString('fr-FR')} pts</span>
                    </div>
                  </div>
                </div>

                {/* ── Points per correct answer input ── */}
                <div className="settings-section">
                  <h3 className="settings-label"><IconZap /> Points par bonne réponse</h3>
                  <p className="settings-hint">
                    Le <strong>1er joueur</strong> à trouver la bonne réponse reçoit 100% des points. Les joueurs suivants perdent 10% par seconde écoulée après lui (ex: -10% dès 0.1s, -20% après 1s, etc.).
                  </p>
                  <div className="pts-input-row">
                    <div className="pts-input-group">
                      <input
                        id="input-points-per-answer"
                        type="number"
                        disabled={isHostDisabled}
                        min={10}
                        max={10000}
                        step={10}
                        value={settings.pointsPerAnswer}
                        onChange={e => {
                          const v = Math.max(10, Math.min(10000, Number(e.target.value) || 10))
                          updateGameSettings({ pointsPerAnswer: v })
                        }}
                        className="pts-input"
                      />
                      <span className="pts-input-unit">pts</span>
                    </div>
                    <div className="pts-presets">
                      {[50, 100, 200, 500].map(p => (
                        <button
                          key={p}
                          disabled={isHostDisabled}
                          className={`pts-preset-btn ${settings.pointsPerAnswer === p ? 'pts-preset-btn--active' : ''}`}
                          onClick={() => updateGameSettings({ pointsPerAnswer: p })}
                          id={`ppa-${p}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="slider-control-group">
                    <div className="slider-input-row">
                      <input
                        type="range"
                        disabled={isHostDisabled}
                        min={10}
                        max={1000}
                        step={10}
                        value={settings.pointsPerAnswer}
                        onChange={e => updateGameSettings({ pointsPerAnswer: Number(e.target.value) })}
                        className="settings-range-slider"
                        id="ppa-slider"
                      />
                      <span className="slider-val-badge">{settings.pointsPerAnswer} pts</span>
                    </div>
                  </div>
                </div>

                {/* ── Points preview ── */}
                <div className="points-preview">
                  <div className="points-preview-title">Système de points multijoueur</div>
                  <p className="pts-decay-desc">
                    🥇 <strong>1er joueur</strong> : 100% ({settings.pointsPerAnswer} pts)<br />
                    ⏱️ <strong>Joueurs suivants</strong> : -10% par seconde de retard après le 1er (ex. 0.1s = -10%, 1.2s = -20%, 2.5s = -30%).
                  </p>
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
              <div className="footer-action-buttons">
                {socket.isHost && (
                  <button
                    className="btn-delete-arena"
                    onClick={() => {
                      if (window.confirm('Voulez-vous vraiment supprimer cette arène ?')) {
                        socket.deleteArena()
                        navigate('/')
                      }
                    }}
                    id="delete-arena"
                    title="Supprimer l'arène"
                  >
                    <IconTrash />
                    <span>Supprimer</span>
                  </button>
                )}
                <button
                  className={`btn-start-game ${(!socket.isHost && socket.players.length > 1) ? 'btn-ready-toggle' : ''}`}
                  onClick={handleStartGame}
                  id="start-game"
                >
                  <IconZap />
                  {(socket.isHost || socket.players.length <= 1) ? 'Lancer la partie' : 'Changer statut Prêt'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
