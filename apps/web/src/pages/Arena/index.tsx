import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconArrowLeft, IconGamepad, IconUser, IconCheck, IconClock,
  IconTrophy, IconShield, IconZap, IconInfinity, IconSettings,
  IconCopy, IconWifi, IconUsers, IconTarget, IconTemplate
} from '../../components/Icons'
import {
  CATEGORY_LABELS, DIFFICULTY_LABELS, ALL_CATEGORIES, CATEGORY_ICONS, DEFAULT_CATEGORY_DIFFICULTIES
} from '../../types'
import type { Category, Difficulty, GameSettings, CategoryInfo, PlayerSummary } from '../../types'
import AudioThemeControls from '../../components/AudioThemeControls'
import TemplateModal from '../../components/TemplateModal/TemplateModal'
import { soundManager } from '../../utils/sound'
import { useArenaSocket } from '../../hooks/useArenaSocket'
import { parseCategoryListParam, serializeCategoryListMap } from '../../utils/tagFilter'
import { API_URL } from '../../utils/config'
import './Arena.css'

const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60]
const ROUND_OPTIONS = [5, 10, 15, 20, 30]

/* ─── Settings Tabs ─── */
type SettingTab = 'general' | 'categories' | 'timer' | 'points'

const TABS: { id: SettingTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Général', icon: <IconSettings /> },
  { id: 'categories', label: 'Catégories', icon: <IconTarget /> },
  { id: 'timer', label: 'Chrono', icon: <IconClock /> },
  { id: 'points', label: 'Points', icon: <IconTrophy /> },
]

/* ─── Player Card ─── */
function PlayerCard({
  player,
  index,
  isSelf,
  onToggleReady,
}: {
  player: PlayerSummary
  index: number
  isSelf: boolean
  onToggleReady: () => void
}) {
  return (
    <div
      className={`ap-card ${player.isHost ? 'ap-card--host' : ''} ${player.isReady ? 'ap-card--ready' : 'ap-card--waiting'} ${isSelf ? 'ap-card--self' : ''}`}
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
          {isSelf && <span className="ap-self-badge">Vous</span>}
          {player.isHost && <span className="ap-host-badge">Hôte</span>}
        </span>
        <span className={`ap-status ${player.isReady ? 'ap-status--ready' : 'ap-status--wait'}`}>
          {player.isReady ? 'Prêt' : 'En attente...'}
        </span>
      </div>
      {isSelf ? (
        <button
          type="button"
          className={`ap-ready-btn ${player.isReady ? 'ap-ready-btn--ready' : 'ap-ready-btn--wait'}`}
          onClick={onToggleReady}
          title="Cliquez pour changer votre statut"
        >
          {player.isReady ? <IconCheck /> : 'Prêt ?'}
        </button>
      ) : (
        <div className={`ap-ready-icon ${player.isReady ? 'ap-ready-icon--yes' : 'ap-ready-icon--no'}`}>
          {player.isReady ? <IconCheck /> : <span className="ap-dots">•••</span>}
        </div>
      )}
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [arenaName, setArenaName] = useState('Chargement...')
  const [maxPlayers, setMaxPlayers] = useState<number>(() => {
    const p = searchParams.get('maxPlayers')
    if (p !== null) {
      const parsed = Number(p)
      if (!Number.isNaN(parsed)) return parsed
    }
    return 8
  })
  const [activeTab, setActiveTab] = useState<SettingTab>('general')
  const [copied, setCopied] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateModalTab, setTemplateModalTab] = useState<'my' | 'public' | 'code' | 'save'>('my')
  const [templateToast, setTemplateToast] = useState<string | null>(null)
  const [tagModeByCat, setTagModeByCat] = useState<Record<string, 'include' | 'ban'>>({})
  const [expandedTagDropdowns, setExpandedTagDropdowns] = useState<Record<string, boolean>>({})
  const [expandedSubTagGroups, setExpandedSubTagGroups] = useState<Record<string, boolean>>({})
  const [tagSearchByCat, setTagSearchByCat] = useState<Record<string, string>>({})
  const [subTagSearchByGroup, setSubTagSearchByGroup] = useState<Record<string, string>>({})

  const [settings, setSettings] = useState<GameSettings>(() => {
    const categoriesParam = searchParams.get('categories')
    const diff = searchParams.get('difficulty') as Difficulty | null
    const inf = searchParams.get('infiniteRounds')
    const rounds = searchParams.get('rounds')
    const time = searchParams.get('time')
    const maxPts = searchParams.get('maxPoints')
    const catDiffsStr = searchParams.get('catDiffs')
    const catTagsStr = searchParams.get('catTags')
    const bannedCatTagsStr = searchParams.get('bannedCatTags')
    const tagsParam = searchParams.get('tags')
    const bannedTagsParam = searchParams.get('bannedTags')

    const initialCategories = categoriesParam
      ? categoriesParam.split(',').map(c => c.trim()).filter(Boolean)
      : ['mythologie', 'capitale', 'geographie', 'histoire', 'sciences']

    const initialCatDiffs: Record<string, Difficulty[]> = { ...DEFAULT_CATEGORY_DIFFICULTIES }
    const parsedDiffs = parseCategoryListParam(catDiffsStr)
    Object.entries(parsedDiffs).forEach(([c, diffs]) => {
      if (diffs.length > 0) initialCatDiffs[c] = diffs as Difficulty[]
    })

    const initialCategoryTags = parseCategoryListParam(catTagsStr)
    const initialBannedCategoryTags = parseCategoryListParam(bannedCatTagsStr)
    const initialTags = tagsParam ? tagsParam.split(',').map(t => t.trim()).filter(Boolean) : []
    const initialBannedTags = bannedTagsParam
      ? bannedTagsParam.split(',').map(t => t.trim()).filter(Boolean)
      : []

    return {
      categories: initialCategories.length > 0 ? initialCategories : ['mythologie', 'capitale', 'geographie', 'histoire', 'sciences'],
      difficulty: diff ?? 'facile',
      difficulties: ['facile', 'moyen', 'difficile'],
      categoryDifficulties: initialCatDiffs,
      categoryTags: initialCategoryTags,
      bannedCategoryTags: initialBannedCategoryTags,
      tags: initialTags,
      bannedTags: initialBannedTags,
      roundCount: rounds && rounds !== 'infinite' ? Number(rounds) : 10,
      timePerRound: time ? Number(time) : 20,
      maxPoints: maxPts ? Number(maxPts) : 1000,
      infiniteRounds: inf === 'true' || rounds === 'infinite',
      pointsPerAnswer: 100,
    }
  })

  // Navigate to play screen
  const navigateToPlay = useCallback(() => {
    const catDiffsStr = serializeCategoryListMap(settings.categoryDifficulties, settings.categories)
    const catTagsStr = serializeCategoryListMap(settings.categoryTags, settings.categories)
    const bannedCatTagsStr = serializeCategoryListMap(settings.bannedCategoryTags, settings.categories)

    const params = new URLSearchParams({
      categories: settings.categories.join(','),
      difficulty: settings.difficulty,
      rounds: settings.infiniteRounds ? 'infinite' : String(settings.roundCount),
      time: String(settings.timePerRound),
      maxPoints: String(settings.maxPoints),
      infiniteRounds: String(settings.infiniteRounds),
      pointsPerAnswer: String(settings.pointsPerAnswer),
      maxPlayers: String(maxPlayers),
      catDiffs: catDiffsStr,
      ...(catTagsStr ? { catTags: catTagsStr } : {}),
      ...(bannedCatTagsStr ? { bannedCatTags: bannedCatTagsStr } : {}),
    })
    navigate(`/play/${arenaId}?${params.toString()}`)
  }, [settings, arenaId, navigate, maxPlayers])

  // Real-time multiplayer WebSocket connection
  const {
    connected,
    selfId,
    isHost,
    players: wsPlayers,
    settings: wsSettings,
    roomError,
    actions,
  } = useArenaSocket({
    arenaId,
    initialSettings: settings as any,
    onGameStarted: navigateToPlay,
  })

  const handleBackToLobby = useCallback(() => {
    actions.leaveArena()
    navigate('/')
  }, [actions, navigate])

  // Sync settings when received from host (guest mode)
  useEffect(() => {
    if (wsSettings && !isHost) {
      setSettings(prev => ({
        ...prev,
        ...wsSettings,
        categoryDifficulties: wsSettings.categoryDifficulties ?? prev.categoryDifficulties,
        categoryTags: wsSettings.categoryTags ?? prev.categoryTags,
        bannedCategoryTags: wsSettings.bannedCategoryTags ?? prev.bannedCategoryTags,
        bannedTags: wsSettings.bannedTags ?? prev.bannedTags,
      }))
    }
  }, [wsSettings, isHost])

  // Sync settings to server when host modifies them
  useEffect(() => {
    if (isHost && connected) {
      actions.updateSettings(settings as any)
    }
  }, [settings, isHost, connected, actions])

  const players: PlayerSummary[] = wsPlayers.length > 0
    ? wsPlayers
    : [{
        id: selfId,
        name: 'Vous',
        isHost: true,
        isReady: true,
        score: 0,
        streak: 0,
        bestStreak: 0,
        hasAnswered: false,
        answeredCorrectly: false,
        answerTime: null,
      }]

  const myPlayer = players.find(p => p.id === selfId)
  const isSelfReady = Boolean(myPlayer?.isReady)

  const handleToggleSelfReady = useCallback(() => {
    soundManager.playClick()
    actions.sendReady(!isSelfReady)
  }, [actions, isSelfReady])

  /* ─── Categories & Subcategories State ─── */
  const [availableCategories, setAvailableCategories] = useState<CategoryInfo[]>([])
  const [matchingQuestionCount, setMatchingQuestionCount] = useState<number | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/questions/categories`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setAvailableCategories(data)
        }
      }
    } catch {
      setAvailableCategories([])
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  /* ─── Dynamic Count of matching questions ─── */
  useEffect(() => {
    const catDiffsStr = serializeCategoryListMap(settings.categoryDifficulties, settings.categories)
    const catTagsStr = serializeCategoryListMap(settings.categoryTags, settings.categories)
    const bannedCatTagsStr = serializeCategoryListMap(settings.bannedCategoryTags, settings.categories)

    const params = new URLSearchParams()
    if (settings.categories.length > 0) {
      params.set('categories', settings.categories.join(','))
    }
    if (catDiffsStr) {
      params.set('catDiffs', catDiffsStr)
    }
    if (catTagsStr) {
      params.set('catTags', catTagsStr)
    }
    if (bannedCatTagsStr) {
      params.set('bannedCatTags', bannedCatTagsStr)
    }
    if (settings.bannedTags && settings.bannedTags.length > 0) {
      params.set('bannedTags', settings.bannedTags.join(','))
    }

    fetch(`${API_URL}/questions/count?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && typeof data.count === 'number') {
          setMatchingQuestionCount(data.count)
        }
      })
      .catch(() => setMatchingQuestionCount(null))
}, [settings.categories, settings.categoryDifficulties, settings.categoryTags, settings.bannedCategoryTags, settings.bannedTags, settings.difficulty])

const toggleIncludeCategoryTag = (
  catId: string,
  tagName: string,
  childTagNames: string[] = [],
  parentTagName?: string
) => {
  soundManager.playClick()
  setSettings(prev => {
    const currentTags = prev.categoryTags[catId] ?? []
    const currentBanned = prev.bannedCategoryTags?.[catId] ?? []
    const exists = currentTags.includes(tagName)

    let nextTags: string[]
    if (exists) {
      nextTags = currentTags.filter(t => t !== tagName)
    } else {
      let filtered = [...currentTags]
      // Selecting parent tag replaces narrow child inclusions so parent covers all sub-tags
      if (childTagNames.length > 0) {
        filtered = filtered.filter(t => !childTagNames.includes(t))
      }
      // Selecting a specific child tag replaces parent inclusion so only that child is matched
      if (parentTagName) {
        filtered = filtered.filter(t => t !== parentTagName)
      }
      nextTags = [...filtered, tagName]
    }

    return {
      ...prev,
      categoryTags: {
        ...prev.categoryTags,
        [catId]: nextTags,
      },
      // Mutual exclusion: remove from banned list if included
      bannedCategoryTags: {
        ...(prev.bannedCategoryTags ?? {}),
        [catId]: currentBanned.filter(t => t !== tagName),
      },
    }
  })
}

const toggleBanCategoryTag = (catId: string, tagName: string, childTagNames: string[] = []) => {
  soundManager.playClick()
  setSettings(prev => {
    const currentBanned = prev.bannedCategoryTags?.[catId] ?? []
    const currentTags = prev.categoryTags[catId] ?? []
    const exists = currentBanned.includes(tagName)
    const nextBanned = exists
      ? currentBanned.filter(t => t !== tagName)
      : [...currentBanned, tagName]

    // Mutual exclusion: remove banned tag (and redundant child inclusions if banning parent) from included list
    const nextIncluded = exists
      ? currentTags
      : currentTags.filter(t => t !== tagName && !childTagNames.includes(t))

    return {
      ...prev,
      categoryTags: {
        ...prev.categoryTags,
        [catId]: nextIncluded,
      },
      bannedCategoryTags: {
        ...(prev.bannedCategoryTags ?? {}),
        [catId]: nextBanned,
      },
    }
  })
}

const handleCategoryTagClick = (
  catId: string,
  tagName: string,
  childTagNames: string[] = [],
  parentTagName?: string
) => {
  const mode = tagModeByCat[catId] ?? 'include'
  if (mode === 'ban') {
    toggleBanCategoryTag(catId, tagName, childTagNames)
  } else {
    toggleIncludeCategoryTag(catId, tagName, childTagNames, parentTagName)
  }
}

const clearCategoryTags = (catId: string) => {
  soundManager.playClick()
  setSettings(prev => ({
    ...prev,
    categoryTags: {
      ...prev.categoryTags,
      [catId]: [], // empty = all questions in this category (excluding any banned tags)
    },
  }))
}

const clearCategoryBans = (catId: string) => {
  soundManager.playClick()
  setSettings(prev => ({
    ...prev,
    bannedCategoryTags: {
      ...(prev.bannedCategoryTags ?? {}),
      [catId]: [],
    },
  }))
}

/* ─── Derived: min points (at end of timer) = 10% of pointsPerAnswer ─── */
const minPointsPerAnswer = Math.max(1, Math.round(settings.pointsPerAnswer * 0.1))

useEffect(() => {
  fetch(`${API_URL}/arenas/${arenaId}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data) {
        if (data.name) setArenaName(data.name)
        if (typeof data.maxPlayers === 'number') {
          setMaxPlayers(data.maxPlayers)
        }
      }
    })
    .catch(() => setArenaName('Mon Arène'))
}, [arenaId])

const handleMaxPlayersChange = (val: number) => {
  soundManager.playClick()
  const cleanVal = Math.max(0, val)
  setMaxPlayers(cleanVal)
  if (arenaId) {
    fetch(`${API_URL}/arenas/${arenaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxPlayers: cleanVal }),
    }).catch(() => {})
  }
}

const toggleCategory = (cat: Category) => {
  setSettings(prev => {
    const has = prev.categories.includes(cat)
    if (has && prev.categories.length === 1) return prev
    return { ...prev, categories: has ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] }
  })
}

const toggleCategoryDifficulty = (cat: Category, diff: Difficulty) => {
  setSettings(prev => {
    const current = prev.categoryDifficulties[cat] ?? ['facile', 'moyen', 'difficile']
    const has = current.includes(diff)
    let updated: Difficulty[]
    if (has) {
      if (current.length === 1) return prev // keep at least 1 difficulty
      updated = current.filter(d => d !== diff)
    } else {
      updated = [...current, diff]
    }
    return {
      ...prev,
      categoryDifficulties: {
        ...prev.categoryDifficulties,
        [cat]: updated,
      },
    }
  })
}

const setCategoryAllDifficulties = (cat: Category) => {
  setSettings(prev => ({
    ...prev,
    categoryDifficulties: {
      ...prev.categoryDifficulties,
      [cat]: ['facile', 'moyen', 'difficile'],
    },
  }))
}

const handleStartGame = () => {
  soundManager.playClick()
  actions.startGame(settings as any)
}

const copyInviteLink = () => {
  soundManager.playClick()
  const link = `${window.location.origin}/arena/${arenaId}`
  navigator.clipboard.writeText(link).then(() => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  })
}

const readyCount = players.filter(p => p.isReady).length

const displayCategories: CategoryInfo[] = availableCategories.length > 0
  ? availableCategories
  : ALL_CATEGORIES.map(c => ({
    id: c,
    name: CATEGORY_LABELS[c] ?? c,
    icon: CATEGORY_ICONS[c] ?? '🏷️',
    count: 0,
    tags: [],
  }))

return (
  <div className="arena" id="arena-page">
    {/* Ambient orbs */}
    <div className="arena-orb arena-orb--1" />
    <div className="arena-orb arena-orb--2" />

    {/* ─── Topbar ─── */}
    <header className="arena-topbar">
      <button className="arena-back" onClick={handleBackToLobby} id="back-to-lobby">
        <IconArrowLeft /><span>Lobby</span>
      </button>

      <div className="arena-topbar-center">
        <div className="arena-topbar-icon"><IconGamepad /></div>
        <h1 className="arena-topbar-title">{arenaName}</h1>
        <span className="arena-id-badge">#{arenaId?.slice(0, 6)}</span>
      </div>

      <div className="arena-topbar-right">
        <AudioThemeControls compact />
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
            <span className="sidebar-count-max">{maxPlayers === 0 ? '∞' : maxPlayers}</span>
          </div>
        </div>

        {/* Ready progress */}
        <div className="ready-progress" id="ready-progress">
          <div className="ready-progress-bar">
            <div
              className="ready-progress-fill"
              style={{ width: `${players.length > 0 ? (readyCount / players.length) * 100 : 0}%` }}
            />
          </div>
          <span className="ready-progress-label">
            {readyCount}/{players.length} prêts
          </span>
        </div>

        <div className="arena-player-list" id="arena-player-list">
          {players.map((p, i) => (
            <PlayerCard
              key={p.id}
              player={p}
              index={i}
              isSelf={p.id === selfId}
              onToggleReady={handleToggleSelfReady}
            />
          ))}
          {/* Empty slots */}
          {maxPlayers === 0 ? (
            <div className="ap-slot">
              <div className="ap-slot-icon"><IconUser /></div>
              <span className="ap-slot-label">En attente d'autres joueurs...</span>
            </div>
          ) : (
            <>
              {Array.from({ length: Math.min(3, Math.max(0, maxPlayers - players.length)) }).map((_, i) => (
                <div key={`slot-${i}`} className="ap-slot">
                  <div className="ap-slot-icon"><IconUser /></div>
                  <span className="ap-slot-label">En attente...</span>
                </div>
              ))}
              {maxPlayers - players.length > 3 && (
                <div className="ap-slot ap-slot--more">
                  <span className="ap-slot-label">+{maxPlayers - players.length - 3} places restantes</span>
                </div>
              )}
            </>
          )}
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
              <div className="summary-chip summary-chip--players">
                <IconUsers />
                {maxPlayers === 0 ? 'Illimité' : `${maxPlayers} joueurs max`}
              </div>
            </div>
          </div>

          {!isHost && (
            <div className="arena-host-banner">
              <span>👑 Salon géré par l'hôte. Indiquez que vous êtes prêt avec le bouton « {isSelfReady ? 'Prêt !' : 'Je suis prêt !'} » ci-dessous (ou sur votre carte à gauche).</span>
            </div>
          )}

          {/* Host Template Toolbar */}
          {isHost && (
            <div className="modal-template-toolbar" style={{ margin: '0 0 16px 0' }}>
              <button
                type="button"
                className="btn-tpl-bar"
                onClick={() => { setTemplateModalTab('my'); setIsTemplateModalOpen(true) }}
              >
                <IconTemplate /> Modèles de partie
              </button>
              <button
                type="button"
                className="btn-tpl-bar btn-tpl-bar--save"
                onClick={() => { setTemplateModalTab('save'); setIsTemplateModalOpen(true) }}
              >
                💾 Sauvegarder ce modèle
              </button>
            </div>
          )}

          {templateToast && (
            <div className="template-toast fade-in">
              <IconCheck /> {templateToast}
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

          {/* ── Tab: General ── */}
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
                <div className="settings-label-row">
                  <h3 className="settings-label">
                    <IconUsers /> Joueurs max
                  </h3>
                  <span className="settings-label-count">
                    {maxPlayers === 0 ? 'Aucune limite (∞)' : `${maxPlayers} joueur${maxPlayers > 1 ? 's' : ''}`}
                  </span>
                </div>

                <div className="option-pills option-pills--wrap">
                  <button
                    type="button"
                    className={`option-pill ${maxPlayers === 0 ? 'option-pill--active' : ''}`}
                    id="max-players-unlimited"
                    onClick={() => handleMaxPlayersChange(0)}
                  >
                    <IconInfinity />
                    <span>Illimité</span>
                  </button>
                  {[2, 4, 6, 8, 10, 16, 20].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`option-pill ${maxPlayers === n ? 'option-pill--active' : ''}`}
                      id={`max-players-${n}`}
                      onClick={() => handleMaxPlayersChange(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {maxPlayers > 0 ? (
                  <div className="slider-control-group fade-in" style={{ marginTop: '12px' }}>
                    <div className="slider-input-row">
                      <input
                        type="range"
                        min={2}
                        max={50}
                        step={1}
                        value={Math.min(50, Math.max(2, maxPlayers))}
                        onChange={e => handleMaxPlayersChange(Number(e.target.value))}
                        className="settings-range-slider"
                        id="max-players-slider"
                      />
                      <span className="slider-val-badge">
                        {maxPlayers} joueur{maxPlayers > 1 ? 's' : ''} max
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="infinite-info-banner fade-in" style={{ marginTop: '12px' }}>
                    <IconInfinity />
                    <span>Aucune limite de participants : tous les joueurs peuvent rejoindre librement l'arène.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Categories ── */}
          {activeTab === 'categories' && (
            <div className="tab-content fade-in" id="tab-content-categories">
              <div className="settings-section">
                <div className="settings-label-row">
                  <div>
                    <h3 className="settings-label"><IconTarget /> Catégories & Sous-catégories (Tags)</h3>
                    <p className="settings-hint" style={{ marginTop: '2px' }}>
                      Activez des catégories, sélectionnez des tags ou passez en mode <strong>🚫 Bannir</strong> (ou clic droit) pour exclure un tag rapidement.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {matchingQuestionCount !== null && (
                      <span
                        className="cat-card-count-badge"
                        style={
                          matchingQuestionCount === 0
                            ? { color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.5)', background: 'rgba(239, 68, 68, 0.12)' }
                            : { color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }
                        }
                      >
                        {matchingQuestionCount === 0
                          ? '⚠️ 0 question disponible'
                          : `${matchingQuestionCount} question${matchingQuestionCount > 1 ? 's' : ''} disponible${matchingQuestionCount > 1 ? 's' : ''}`}
                      </span>
                    )}
                    <span className="settings-label-count">
                      {settings.categories.length}/{displayCategories.length} activées
                    </span>
                  </div>
                </div>

                {/* Quick Preset Bar */}
                <div className="quick-diff-preset-bar">
                  <span className="quick-diff-label">Définir toutes sur :</span>
                  {[
                    { key: 'facile', label: '🟢 Easy' },
                    { key: 'moyen', label: '🟡 Normal' },
                    { key: 'difficile', label: '🔴 Hard' },
                    { key: 'all', label: '✨ Tous (All)' },
                  ].map(preset => (
                    <button
                      key={preset.key}
                      type="button"
                      className="cat-diff-pill"
                      onClick={() => {
                        setSettings(prev => {
                          const nextDiffs = { ...prev.categoryDifficulties }
                          const targetDiffs = preset.key === 'all'
                            ? ['facile', 'moyen', 'difficile'] as Difficulty[]
                            : [preset.key as Difficulty]
                          displayCategories.forEach(c => { nextDiffs[c.id] = targetDiffs })
                          return { ...prev, categoryDifficulties: nextDiffs }
                        })
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Per-Category Cards Grid */}
                <div className="category-diff-list">
                  {displayCategories.map(catItem => {
                    const catId = catItem.id
                    const isSelected = settings.categories.includes(catId)
                    const currentDiffs = settings.categoryDifficulties[catId] ?? ['facile', 'moyen', 'difficile']
                    const isAllDiffsSelected = currentDiffs.length === 3
                    const selectedTagsForCat = settings.categoryTags[catId] ?? []
                    const bannedTagsForCat = settings.bannedCategoryTags?.[catId] ?? []
                    const tagMode = tagModeByCat[catId] ?? 'include'
                    const isLargeTagList = (catItem.tags?.length ?? 0) > 10
                    const isTagDropdownOpen = !isLargeTagList || Boolean(expandedTagDropdowns[catId])
                    const tagSearchQuery = (tagSearchByCat[catId] ?? '').toLowerCase().trim()
                    const tagChildrenMap = catItem.tagChildren ?? {}
                    const filteredTags = (catItem.tags ?? []).filter(t =>
                      !tagSearchQuery || t.name.toLowerCase().includes(tagSearchQuery)
                    )

                    const statusParts: string[] = []
                    if (selectedTagsForCat.length > 0) {
                      statusParts.push(`${selectedTagsForCat.length} sélectionné(e)s`)
                    } else {
                      statusParts.push('✨ Toutes')
                    }
                    if (bannedTagsForCat.length > 0) {
                      statusParts.push(`🚫 ${bannedTagsForCat.length} banni${bannedTagsForCat.length > 1 ? 's' : ''}`)
                    }

                    return (
                        <div key={catId} className={`category-card ${isSelected ? 'category-card--active' : ''}`}>
                          <div className="category-card-header">
                            <div className="category-card-title-group" onClick={() => toggleCategory(catId)}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCategory(catId)}
                                style={{ accentColor: 'var(--color-accent)', cursor: 'pointer' }}
                              />
                              <span className="category-emoji">{catItem.icon || CATEGORY_ICONS[catId] || '🏷️'}</span>
                              <span className="category-card-name">{catItem.name || CATEGORY_LABELS[catId] || catId}</span>
                            </div>
                            {catItem.count > 0 && (
                              <span className="cat-card-count-badge">
                                {catItem.count} question{catItem.count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {isSelected && (
                            <div className="category-card-body fade-in">
                              {/* ── Subcategories (Tags & Bans) ── */}
                              {catItem.tags && catItem.tags.length > 0 && (
                                <div className="category-subcategories-block">
                                  <div className="category-subcategories-header">
                                    <div className="category-subcategories-title-row">
                                      <span className="category-subcategories-label">
                                        🏷️ Tags ({catItem.tags.length}) :
                                      </span>
                                      <div className="cat-tag-mode-switch" role="group" aria-label="Mode d'action sur les tags">
                                        <button
                                          type="button"
                                          className={`cat-mode-btn ${tagMode === 'include' ? 'cat-mode-btn--include-active' : ''}`}
                                          onClick={() => setTagModeByCat(prev => ({ ...prev, [catId]: 'include' }))}
                                          title="Cliquer un tag pour l'inclure"
                                        >
                                          🎯 Inclure
                                        </button>
                                        <button
                                          type="button"
                                          className={`cat-mode-btn ${tagMode === 'ban' ? 'cat-mode-btn--ban-active' : ''}`}
                                          onClick={() => setTagModeByCat(prev => ({ ...prev, [catId]: 'ban' }))}
                                          title="Cliquer un tag pour le bannir (ou clic droit à tout moment)"
                                        >
                                          🚫 Bannir
                                        </button>
                                      </div>
                                    </div>
                                    <span className={`category-subcategories-info ${bannedTagsForCat.length > 0 ? 'has-bans' : ''}`}>
                                      {statusParts.join(' • ')}
                                    </span>
                                  </div>

                                  {isLargeTagList && (
                                    <div className="cat-tags-dropdown-bar">
                                      <button
                                        type="button"
                                        className={`cat-tags-dropdown-trigger ${isTagDropdownOpen ? 'is-open' : ''}`}
                                        onClick={() => setExpandedTagDropdowns(prev => ({ ...prev, [catId]: !prev[catId] }))}
                                      >
                                        <span>
                                          {isTagDropdownOpen
                                            ? `▲ Masquer les ${catItem.tags.length} tags`
                                            : `▼ Menu déroulant (${catItem.tags.length} tags disponible${catItem.tags.length > 1 ? 's' : ''})`}
                                        </span>
                                        <span className="cat-tags-dropdown-chevron">{isTagDropdownOpen ? '▴' : '▾'}</span>
                                      </button>

                                      {!isTagDropdownOpen && (selectedTagsForCat.length > 0 || bannedTagsForCat.length > 0) && (
                                        <div className="category-subcategories-pills cat-active-summary-pills">
                                          {selectedTagsForCat.map(tag => (
                                            <button
                                              key={`sum-inc-${tag}`}
                                              type="button"
                                              className="cat-tag-pill cat-tag-pill--active"
                                              onClick={() => toggleIncludeCategoryTag(catId, tag)}
                                              title="Cliquer pour retirer ce filtre"
                                            >
                                              #{tag} ✕
                                            </button>
                                          ))}
                                          {bannedTagsForCat.map(tag => (
                                            <button
                                              key={`sum-ban-${tag}`}
                                              type="button"
                                              className="cat-tag-pill cat-tag-pill--banned"
                                              onClick={() => toggleBanCategoryTag(catId, tag)}
                                              title="Cliquer pour débannir ce tag"
                                            >
                                              🚫 <span className="cat-tag-banned-text">#{tag}</span> ✕
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {isTagDropdownOpen && (
                                    <div className={isLargeTagList ? 'cat-tags-dropdown-panel fade-in' : ''}>
                                      {isLargeTagList && (
                                        <div className="cat-tags-search-row">
                                          <input
                                            type="text"
                                            className="cat-tags-search-input"
                                            placeholder={`Filtrer parmi ${catItem.tags.length} tags...`}
                                            value={tagSearchByCat[catId] ?? ''}
                                            onChange={e => setTagSearchByCat(prev => ({ ...prev, [catId]: e.target.value }))}
                                          />
                                        </div>
                                      )}

                                      <div className="category-subcategories-pills">
                                        <button
                                          type="button"
                                          className={`cat-tag-pill ${selectedTagsForCat.length === 0 ? 'cat-tag-pill--all-active' : ''}`}
                                          onClick={() => clearCategoryTags(catId)}
                                          title="Inclure toutes les questions de cette catégorie (conserve les bans)"
                                        >
                                          ✨ Toutes
                                        </button>

                                        {bannedTagsForCat.length > 0 && (
                                          <button
                                            type="button"
                                            className="cat-tag-pill cat-tag-pill--unban-all"
                                            onClick={() => clearCategoryBans(catId)}
                                            title="Supprimer tous les bans de cette catégorie"
                                          >
                                            🔓 Débannir ({bannedTagsForCat.length})
                                          </button>
                                        )}

                                        {filteredTags.map(t => {
                                          const childTags = tagChildrenMap[t.name] ?? []
                                          const childTagNames = childTags.map(c => c.name)
                                          const isTagActive = selectedTagsForCat.includes(t.name)
                                          const isTagBanned = bannedTagsForCat.includes(t.name)
                                          const activeChildIncCount = childTagNames.filter(n => selectedTagsForCat.includes(n)).length
                                          const activeChildBanCount = childTagNames.filter(n => bannedTagsForCat.includes(n)).length
                                          const subGroupKey = `${catId}:${t.name}`
                                          const isSubGroupOpen = Boolean(expandedSubTagGroups[subGroupKey])

                                          if (childTags.length > 0) {
                                            return (
                                              <div key={t.name} className="cat-tag-group-wrap">
                                                <button
                                                  type="button"
                                                  className={`cat-tag-pill cat-tag-pill--has-sub ${isTagActive ? 'cat-tag-pill--active' : ''} ${isTagBanned ? 'cat-tag-pill--banned' : ''}`}
                                                  onClick={() => handleCategoryTagClick(catId, t.name, childTagNames)}
                                                  onContextMenu={e => {
                                                    e.preventDefault()
                                                    toggleBanCategoryTag(catId, t.name, childTagNames)
                                                  }}
                                                  id={`cat-tag-${catId}-${t.name.toLowerCase()}`}
                                                  title={
                                                    tagMode === 'ban'
                                                      ? `Cliquer pour bannir/débannir tout #${t.name}`
                                                      : `Cliquer pour inclure #${t.name} (clic droit pour bannir)`
                                                  }
                                                >
                                                  {isTagBanned ? '🚫 ' : ''}
                                                  <span className={isTagBanned ? 'cat-tag-banned-text' : ''}>#{t.name}</span>
                                                  {t.count > 0 && <span className="cat-tag-count">{t.count}</span>}
                                                </button>
                                                <button
                                                  type="button"
                                                  className={`cat-subtag-dropdown-btn ${isSubGroupOpen ? 'is-open' : ''} ${activeChildIncCount > 0 || activeChildBanCount > 0 ? 'has-filters' : ''}`}
                                                  onClick={() =>
                                                    setExpandedSubTagGroups(prev => ({
                                                      ...prev,
                                                      [subGroupKey]: !prev[subGroupKey],
                                                    }))
                                                  }
                                                  title={`Ouvrir le menu déroulant des seconds tags de ${t.name}`}
                                                >
                                                  <span>▾ {childTags.length}</span>
                                                  {activeChildIncCount > 0 && <span className="subtag-mini-badge subtag-mini-badge--inc">+{activeChildIncCount}</span>}
                                                  {activeChildBanCount > 0 && <span className="subtag-mini-badge subtag-mini-badge--ban">🚫{activeChildBanCount}</span>}
                                                </button>
                                              </div>
                                            )
                                          }

                                          return (
                                            <button
                                              key={t.name}
                                              type="button"
                                              className={`cat-tag-pill ${isTagActive ? 'cat-tag-pill--active' : ''} ${isTagBanned ? 'cat-tag-pill--banned' : ''}`}
                                              onClick={() => handleCategoryTagClick(catId, t.name)}
                                              onContextMenu={e => {
                                                e.preventDefault()
                                                toggleBanCategoryTag(catId, t.name)
                                              }}
                                              id={`cat-tag-${catId}-${t.name.toLowerCase()}`}
                                              title={
                                                tagMode === 'ban'
                                                  ? `Cliquer pour bannir/débannir #${t.name}`
                                                  : `Cliquer pour inclure #${t.name} (clic droit pour bannir)`
                                              }
                                            >
                                              {isTagBanned ? '🚫 ' : ''}
                                              <span className={isTagBanned ? 'cat-tag-banned-text' : ''}>#{t.name}</span>
                                              {t.count > 0 && <span className="cat-tag-count">{t.count}</span>}
                                            </button>
                                          )
                                        })}
                                      </div>

                                      {/* ── Expanded sub-tag dropdowns (e.g. Personnage -> One Piece / Naruto / Bleach) ── */}
                                      {Object.entries(tagChildrenMap).map(([parentName, childTags]) => {
                                        const subGroupKey = `${catId}:${parentName}`
                                        if (!expandedSubTagGroups[subGroupKey] || childTags.length === 0) return null
                                        const isParentBanned = bannedTagsForCat.includes(parentName)
                                        const subQuery = (subTagSearchByGroup[subGroupKey] ?? '').trim().toLowerCase()
                                        const visibleChildTags = childTags.filter(c =>
                                          !subQuery || c.name.toLowerCase().includes(subQuery)
                                        )
                                        return (
                                          <div key={subGroupKey} className="cat-subtag-dropdown-panel fade-in">
                                            <div className="cat-subtag-dropdown-header">
                                              <span>
                                                🎭 <strong>{parentName}</strong> — Second tag ({tagMode === 'ban' ? 'clic = bannir' : 'clic = inclure, clic droit = bannir'}) :
                                              </span>
                                              <button
                                                type="button"
                                                className="cat-subtag-close-btn"
                                                onClick={() =>
                                                  setExpandedSubTagGroups(prev => ({ ...prev, [subGroupKey]: false }))
                                                }
                                                title="Fermer ce menu"
                                              >
                                                ✕
                                              </button>
                                            </div>
                                            {isParentBanned ? (
                                              <div className="cat-subtag-parent-banned-banner">
                                                <span>🚫 Tout le tag <strong>#{parentName}</strong> est banni (toutes les séries sont exclues).</span>
                                                <button
                                                  type="button"
                                                  className="cat-tag-pill cat-tag-pill--unban-all"
                                                  onClick={() => toggleBanCategoryTag(catId, parentName, childTags.map(c => c.name))}
                                                >
                                                  🔓 Débannir #{parentName}
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                {childTags.length > 10 && (
                                                  <div className="cat-tags-search-row">
                                                    <input
                                                      type="text"
                                                      className="cat-tags-search-input"
                                                      placeholder={`Rechercher parmi ${childTags.length} séries...`}
                                                      value={subTagSearchByGroup[subGroupKey] ?? ''}
                                                      onChange={e =>
                                                        setSubTagSearchByGroup(prev => ({ ...prev, [subGroupKey]: e.target.value }))
                                                      }
                                                    />
                                                  </div>
                                                )}
                                                <div className="category-subcategories-pills cat-subtag-pills-scroll">
                                                  {visibleChildTags.map(child => {
                                                    const isChildActive = selectedTagsForCat.includes(child.name)
                                                    const isChildBanned = bannedTagsForCat.includes(child.name)
                                                    return (
                                                      <button
                                                        key={child.name}
                                                        type="button"
                                                        className={`cat-tag-pill ${isChildActive ? 'cat-tag-pill--active' : ''} ${isChildBanned ? 'cat-tag-pill--banned' : ''}`}
                                                        onClick={() => handleCategoryTagClick(catId, child.name, [], parentName)}
                                                        onContextMenu={e => {
                                                          e.preventDefault()
                                                          toggleBanCategoryTag(catId, child.name)
                                                        }}
                                                        id={`cat-subtag-${catId}-${parentName.toLowerCase()}-${child.name.toLowerCase()}`}
                                                      >
                                                        {isChildBanned ? '🚫 ' : ''}
                                                        <span className={isChildBanned ? 'cat-tag-banned-text' : ''}>#{child.name}</span>
                                                        {child.count > 0 && <span className="cat-tag-count">{child.count}</span>}
                                                      </button>
                                                    )
                                                  })}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ── Difficulties ── */}
                              <div className="category-diff-pills-row">
                                <span className="category-diff-label">Difficulté :</span>
                                {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => {
                                  const active = currentDiffs.includes(d)
                                  return (
                                    <button
                                      key={d}
                                      type="button"
                                      className={`cat-diff-pill ${active ? 'cat-diff-pill--active diff--' + d : ''}`}
                                      onClick={() => toggleCategoryDifficulty(catId, d)}
                                      id={`cat-diff-${catId}-${d}`}
                                    >
                                      {d === 'facile' ? '🟢 Easy' : d === 'moyen' ? '🟡 Normal' : '🔴 Hard'}
                                    </button>
                                  )
                                })}
                                <button
                                  type="button"
                                  className={`cat-diff-pill ${isAllDiffsSelected ? 'cat-diff-pill--active' : ''}`}
                                  onClick={() => setCategoryAllDifficulties(catId)}
                                  id={`cat-diff-${catId}-all`}
                                >
                                  ✨ Tous
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="settings-hint">Au moins 1 catégorie requise.</p>
                </div>
              </div>
            )}

              {/* ── Tab: Timer ── */}
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
                      <div className="slider-control-group">
                        <div className="slider-input-row">
                          <input
                            type="range"
                            min={1}
                            max={50}
                            step={1}
                            value={settings.roundCount}
                            onChange={e => setSettings(prev => ({ ...prev, roundCount: Number(e.target.value) }))}
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
                          className={`option-pill ${settings.timePerRound === t ? 'option-pill--active' : ''}`}
                          onClick={() => setSettings(prev => ({ ...prev, timePerRound: t }))}
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
                          min={5}
                          max={120}
                          step={1}
                          value={settings.timePerRound}
                          onChange={e => setSettings(prev => ({ ...prev, timePerRound: Number(e.target.value) }))}
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
                    <div className="slider-control-group">
                      <div className="slider-input-row">
                        <input
                          type="range"
                          min={100}
                          max={10000}
                          step={50}
                          value={settings.maxPoints}
                          onChange={e => setSettings(prev => ({ ...prev, maxPoints: Number(e.target.value) }))}
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
                    <div className="slider-control-group">
                      <div className="slider-input-row">
                        <input
                          type="range"
                          min={10}
                          max={1000}
                          step={10}
                          value={settings.pointsPerAnswer}
                          onChange={e => setSettings(prev => ({ ...prev, pointsPerAnswer: Number(e.target.value) }))}
                          className="settings-range-slider"
                          id="ppa-slider"
                        />
                        <span className="slider-val-badge">{settings.pointsPerAnswer} pts</span>
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
                        { label: '🥇 Joueur 1', t: 0, badge: '1er à répondre', isFirst: true },
                        { label: '🥈 Joueur 2', t: 0.25, badge: null, isFirst: false },
                        { label: '🥉 Joueur 3', t: 0.55, badge: null, isFirst: false },
                        { label: '4️⃣  Joueur 4', t: 0.9, badge: null, isFirst: false },
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


              {(matchingQuestionCount === 0 || roomError) && (
                <div className="arena-filter-warning-banner fade-in">
                  ⚠️ {roomError || 'Aucune question disponible avec les catégories, difficultés et tags bannis actuels. Allégez vos filtres avant de lancer.'}
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
                {isHost ? (
                  <button
                    className="btn-start-game"
                    onClick={handleStartGame}
                    id="start-game"
                    disabled={readyCount < 1 || matchingQuestionCount === 0}
                    title={
                      matchingQuestionCount === 0
                        ? 'Aucune question disponible avec vos filtres et bans actuels'
                        : readyCount < 1
                          ? 'Au moins un joueur doit être prêt'
                          : 'Lancer la partie'
                    }
                  >
                    <IconZap />
                    Lancer la partie
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`btn-start-game btn-ready-toggle ${isSelfReady ? 'btn-ready-toggle--ready' : 'btn-ready-toggle--wait'}`}
                    onClick={handleToggleSelfReady}
                    id="toggle-ready-main"
                    title={isSelfReady ? "Cliquez si vous n'êtes plus prêt" : "Cliquez pour vous déclarer prêt"}
                  >
                    {isSelfReady ? <IconCheck /> : <IconZap />}
                    {isSelfReady ? 'Prêt ! (En attente de l\'hôte...)' : 'Je suis prêt !'}
                  </button>
                )}
              </div>
            </div>
        </main>
    </div>

    <TemplateModal
      isOpen={isTemplateModalOpen}
      onClose={() => setIsTemplateModalOpen(false)}
      currentSettings={settings}
      initialTab={templateModalTab}
      onApplyTemplate={(newSettings, tplName) => {
        setSettings(prev => ({
          ...prev,
          ...newSettings,
          categories: newSettings.categories ?? prev.categories,
          categoryDifficulties: newSettings.categoryDifficulties ?? prev.categoryDifficulties,
          categoryTags: newSettings.categoryTags ?? {},
          bannedCategoryTags: newSettings.bannedCategoryTags ?? {},
          bannedTags: newSettings.bannedTags ?? [],
        }))
        setTemplateToast(`Modèle "${tplName}" appliqué à l'arène !`)
        setTimeout(() => setTemplateToast(null), 3000)
      }}
    />
  </div>
)
}
