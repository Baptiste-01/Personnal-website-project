import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconGamepad, IconRefresh, IconZap, IconUser,
  IconInbox, IconAlertCircle, IconLogin,
  IconBookOpen, IconHeart, IconLock, IconChevronRight, IconTarget, IconTrophy, IconX,
  IconInfinity, IconTrash, IconShield
} from '../../components/Icons'
import { DIFFICULTY_LABELS, getCategoryLabel, getCategoryIcon } from '../../types'
import type { Difficulty, AuthUser, Category } from '../../types'
import { useCategories } from '../../hooks/useCategories'
import Slider from '../../components/Slider/Slider'
import type { SlideItem } from '../../components/Slider/Slider'
import './Lobby.css'

/* ─── Types ─── */
interface ArenaItem {
  id: string
  name: string
  players: number
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  gameMode: string
  difficulty: Difficulty
  roundCount?: number
  timePerRound?: number
  maxPoints?: number
  infiniteRounds?: boolean
  totalPoints?: number
}

type FetchState = 'idle' | 'loading' | 'success' | 'error'

interface GameRule {
  id: string
  name: string
  description: string
  pointsTotal: number
  difficulty: Difficulty
  roundCount: number
  timePerRound: number
  infiniteRounds?: boolean
  categories?: string[]
}

/* ─── Static game rules catalog ─── */
const GAME_RULES: GameRule[] = [
  {
    id: 'flashguess-classic',
    name: 'FlashGuess Classique',
    description: 'Répondez le plus vite possible. Plus vous êtes rapide, plus vous gagnez de points.',
    pointsTotal: 1000,
    difficulty: 'moyen',
    roundCount: 10,
    timePerRound: 20,
    infiniteRounds: false,
  },
  {
    id: 'flashguess-infinite',
    name: 'FlashGuess Infini',
    description: 'Manches infinies ! La partie continue jusqu’à ce qu’un joueur atteigne la limite de points.',
    pointsTotal: 1000,
    difficulty: 'moyen',
    roundCount: 0,
    timePerRound: 20,
    infiniteRounds: true,
  },
  {
    id: 'flashguess-sprint',
    name: 'FlashGuess Sprint',
    description: 'Manche courte et intense. Seulement 5 questions, chacune vaut gros.',
    pointsTotal: 500,
    difficulty: 'facile',
    roundCount: 5,
    timePerRound: 15,
    infiniteRounds: false,
  },
  {
    id: 'flashguess-expert',
    name: 'FlashGuess Expert',
    description: 'Pour les connaisseurs. Questions difficiles, temps réduit, récompenses maximales.',
    pointsTotal: 2000,
    difficulty: 'difficile',
    roundCount: 15,
    timePerRound: 12,
    infiniteRounds: false,
  },
]

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  facile: 'diff--easy',
  easy: 'diff--easy',
  moyen: 'diff--medium',
  normal: 'diff--medium',
  difficile: 'diff--hard',
  hard: 'diff--hard',
}

interface CreateArenaSettings {
  name: string
  difficulty: Difficulty
  categoryDifficulties: Record<string, Difficulty[]>
  categories: string[]
  infiniteRounds: boolean
  roundCount: number
  timePerRound: number
  maxPoints: number
}

/* ─── Create Arena Modal ─── */
function CreateArenaModal({
  availableCategories,
  onClose,
  onCreate,
  initialRule,
}: {
  availableCategories: string[]
  onClose: () => void
  onCreate: (settings: CreateArenaSettings) => Promise<void>
  initialRule?: GameRule | null
}) {
  const [name, setName] = useState(initialRule ? `Arène ${initialRule.name}` : '')
  const [difficulty, setDifficulty] = useState<Difficulty>(initialRule?.difficulty ?? 'moyen')
  const [categories, setCategories] = useState<Category[]>(() =>
    initialRule?.categories && initialRule.categories.length > 0
      ? [...initialRule.categories]
      : [...availableCategories]
  )
  const [infiniteRounds, setInfiniteRounds] = useState(initialRule?.infiniteRounds ?? false)
  const [roundCount, setRoundCount] = useState(initialRule?.roundCount && initialRule.roundCount > 0 ? initialRule.roundCount : 10)
  const [timePerRound, setTimePerRound] = useState(initialRule?.timePerRound ?? 20)
  const [maxPoints, setMaxPoints] = useState(initialRule?.pointsTotal ?? 1000)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (categories.length === 0 && availableCategories.length > 0) {
      setCategories([...availableCategories])
    }
  }, [availableCategories])

  useEffect(() => {
    inputRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const toggleCat = (c: Category) => {
    setCategories(prev => {
      if (prev.includes(c)) {
        if (prev.length === 1) return prev
        return prev.filter(x => x !== c)
      }
      return [...prev, c]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Le nom de l\'arène est requis.'); return }
    setIsSubmitting(true)
    setError('')

    const categoryDifficulties: Record<string, Difficulty[]> = {}
    categories.forEach(cat => {
      categoryDifficulties[cat] = [difficulty]
    })

    try {
      await onCreate({
        name: trimmed,
        difficulty,
        categoryDifficulties,
        categories,
        infiniteRounds,
        roundCount,
        timePerRound,
        maxPoints,
      })
    } catch {
      setError('Impossible de créer l\'arène. Le serveur est-il démarré ?')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" id="create-arena-modal" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon"><IconGamepad /></div>
            <h2 className="modal-title">Créer une arène</h2>
          </div>
          <button className="modal-close" onClick={onClose} id="modal-close"><IconX /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Nom */}
          <div className="modal-field">
            <label className="modal-label" htmlFor="arena-name-input">Nom de l'arène</label>
            <input
              ref={inputRef}
              id="arena-name-input"
              type="text"
              className="modal-input"
              placeholder="Ex: La Ligue des Champions"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={40}
              required
            />
          </div>

          {/* Difficulté */}
          <div className="modal-field">
            <label className="modal-label">Difficulté</label>
            <div className="modal-diff-row">
              {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  type="button"
                  className={`modal-diff-btn ${difficulty === d ? 'modal-diff-btn--active ' + DIFFICULTY_COLOR[d] : ''}`}
                  onClick={() => setDifficulty(d)}
                  id={`modal-diff-${d}`}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Catégories */}
          <div className="modal-field">
            <label className="modal-label">Catégories ({categories.length}/{availableCategories.length})</label>
            <div className="modal-cat-grid">
              {availableCategories.map(cat => {
                const active = categories.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`modal-cat-pill ${active ? 'modal-cat-pill--active' : ''}`}
                    onClick={() => toggleCat(cat)}
                  >
                    <span>{getCategoryIcon(cat)}</span>
                    <span>{getCategoryLabel(cat)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Configuration rapide */}
          <div className="modal-grid-3">
            <div className="modal-field">
              <label className="modal-label">Manches</label>
              <div className="modal-options-pills">
                {[5, 10, 20].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`modal-option-pill ${!infiniteRounds && roundCount === n ? 'modal-option-pill--active' : ''}`}
                    onClick={() => { setInfiniteRounds(false); setRoundCount(n) }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  className={`modal-option-pill ${infiniteRounds ? 'modal-option-pill--active' : ''}`}
                  onClick={() => setInfiniteRounds(true)}
                >
                  ∞
                </button>
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Temps / Q</label>
              <div className="modal-options-pills">
                {[10, 15, 20, 30].map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`modal-option-pill ${timePerRound === t ? 'modal-option-pill--active' : ''}`}
                    onClick={() => setTimePerRound(t)}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">Score Max</label>
              <div className="modal-options-pills">
                {[500, 1000, 2000].map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`modal-option-pill ${maxPoints === p ? 'modal-option-pill--active' : ''}`}
                    onClick={() => setMaxPoints(p)}
                  >
                    {p >= 1000 ? `${p / 1000}k` : p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>Annuler</button>
            <button
              type="submit"
              className={`modal-submit ${isSubmitting ? 'is-loading' : ''}`}
              id="modal-submit"
              disabled={isSubmitting}
            >
              <IconZap />
              {isSubmitting ? 'Création...' : 'Créer et rejoindre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Delete Arena Modal (Admin) ─── */
function DeleteArenaModal({
  arena,
  onClose,
  onConfirm,
}: {
  arena: ArenaItem
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleDelete = async () => {
    setIsDeleting(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch {
      setError("Impossible de supprimer l'arène. Réessayez plus tard.")
      setIsDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" id="delete-arena-modal" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon modal-danger-icon"><IconTrash /></div>
            <h2 className="modal-title">Supprimer l'arène</h2>
          </div>
          <button className="modal-close" onClick={onClose} id="modal-delete-close"><IconX /></button>
        </div>

        <div className="modal-body">
          <p className="modal-desc-text">
            Êtes-vous sûr de vouloir supprimer définitivement l'arène <span className="modal-desc-highlight">« {arena.name} »</span> ?
          </p>
          <p className="modal-warning-text">
            Cette action est irréversible et supprimera la salle ainsi que ses connexions.
          </p>
          {error && <p className="modal-error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose} disabled={isDeleting}>Annuler</button>
          <button
            type="button"
            className={`modal-danger-btn ${isDeleting ? 'is-loading' : ''}`}
            id="modal-confirm-delete-btn"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <IconTrash />
            {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Skeleton ─── */
function SkeletonList() {
  return (
    <div className="skeleton-list">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-item">
          <div className="skeleton-info">
            <div className="skeleton-line skeleton-line--name" />
            <div className="skeleton-line skeleton-line--meta" />
          </div>
          <div className="skeleton-actions">
            <div className="skeleton-badge" />
            <div className="skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Arena Card ─── */
function ArenaCard({
  arena,
  onJoin,
  isAdmin = false,
  onDelete,
}: {
  arena: ArenaItem
  onJoin: (id: string) => void
  isAdmin?: boolean
  onDelete?: (arena: ArenaItem) => void
}) {
  const isLive = arena.status === 'playing'
  const statusClass = isLive ? 'status-badge--live' : 'status-badge--waiting'
  const statusLabel = isLive ? 'En cours' : 'En attente'
  const isInfinite = arena.infiniteRounds || arena.roundCount === 0
  const roundsDisplay = isInfinite ? '∞ manches' : `${arena.roundCount ?? 10} manches`

  return (
    <div className="arena-card" id={`arena-${arena.id}`} onClick={() => onJoin(arena.id)}>
      <div className="arena-card-left">
        <div className="arena-card-top">
          <span className="arena-name">{arena.name}</span>
          <span className={`diff-badge ${DIFFICULTY_COLOR[arena.difficulty]}`}>
            {DIFFICULTY_LABELS[arena.difficulty]}
          </span>
        </div>
        <div className="arena-card-chips">
          <span className="arena-chip">
            <IconTarget />
            {arena.gameMode === 'flashguess' ? 'FlashGuess' : arena.gameMode}
          </span>
          <span className="arena-chip">
            {isInfinite ? <IconInfinity /> : <IconZap />}
            {roundsDisplay}
          </span>
          <span className="arena-chip">
            <IconTrophy />
            {(arena.maxPoints ?? arena.totalPoints ?? 1000)} pts max
          </span>
        </div>
      </div>

      <div className="arena-actions">
        <div className="arena-meta-group">
          <span className="player-count">
            <IconUser />
            {arena.players}/{arena.maxPlayers}
          </span>
          <span className={`status-badge ${statusClass}`}>
            <span className="status-dot" />
            {statusLabel}
          </span>
        </div>
        <div className="arena-buttons-group">
          <button className="btn-join" id={`join-${arena.id}`}>Rejoindre</button>
          {isAdmin && (
            <button
              type="button"
              className="btn-delete-arena"
              id={`delete-arena-${arena.id}`}
              title="Supprimer l'arène (Admin)"
              aria-label={`Supprimer l'arène ${arena.name}`}
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(arena)
              }}
            >
              <IconTrash />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Game Rule Card ─── */
function GameRuleCard({
  rule,
  isConnected,
  isFavorite,
  onToggleFavorite,
  onSelectRule,
}: {
  rule: GameRule
  isConnected: boolean
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onSelectRule?: (rule: GameRule) => void
}) {
  const isInfinite = rule.infiniteRounds || rule.roundCount === 0
  return (
    <div
      className={`game-rule-card ${isFavorite ? 'game-rule-card--fav' : ''}`}
      id={`rule-${rule.id}`}
      onClick={() => onSelectRule?.(rule)}
      style={{ cursor: 'pointer' }}
      title="Cliquer pour créer une arène avec ce mode"
    >
      <div className="game-rule-header">
        <div className="game-rule-name-row">
          <h3 className="game-rule-name">{rule.name}</h3>
          <span className={`diff-badge ${DIFFICULTY_COLOR[rule.difficulty]}`}>
            {DIFFICULTY_LABELS[rule.difficulty]}
          </span>
        </div>
        {isConnected ? (
          <button
            className={`btn-fav ${isFavorite ? 'btn-fav--active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(rule.id)
            }}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            id={`fav-${rule.id}`}
          >
            <IconHeart filled={isFavorite} />
          </button>
        ) : (
          <div className="btn-fav-locked" title="Connectez-vous pour sauvegarder des favoris">
            <IconLock />
          </div>
        )}
      </div>

      <p className="game-rule-desc">{rule.description}</p>

      <div className="game-rule-stats">
        <div className="rule-stat">
          <span className="rule-stat-value">{rule.pointsTotal}</span>
          <span className="rule-stat-label">Points max</span>
        </div>
        <div className="rule-stat-sep" />
        <div className="rule-stat">
          <span className="rule-stat-value">{isInfinite ? '∞' : rule.roundCount}</span>
          <span className="rule-stat-label">Manches</span>
        </div>
        <div className="rule-stat-sep" />
        <div className="rule-stat">
          <span className="rule-stat-value">{rule.timePerRound}s</span>
          <span className="rule-stat-label">/question</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Slider data ─── */
const LOBBY_SLIDES: SlideItem[] = [
  {
    id: 'classic',
    title: 'FlashGuess Classique',
    description: 'Répondez vite, gagnez des points. 10 manches · 20s chacune · 1 000 pts max.',
    tag: 'Classique',
    tagColor: 'blue',
  },
  {
    id: 'sprint',
    title: 'FlashGuess Sprint',
    description: 'Manche courte et intense. 5 questions, chacune vaut gros.',
    tag: 'Facile',
    tagColor: 'green',
  },
  {
    id: 'expert',
    title: 'FlashGuess Expert',
    description: 'Questions difficiles, temps réduit. 15 manches · 2 000 pts max.',
    tag: 'Expert',
    tagColor: 'red',
  },
  {
    id: 'duo',
    title: 'Duel 1v1',
    description: 'Affrontez un adversaire en direct sur 8 questions de feu.',
    tag: 'Compétitif',
    tagColor: 'purple',
  },
  {
    id: 'blitz',
    title: 'Blitz Mode',
    description: 'Questions express à 5 secondes chrono. Seuls les plus rapides survivent.',
    tag: 'Vitesse',
    tagColor: 'orange',
  },
  {
    id: 'team',
    title: 'Team Battle',
    description: '4v4 en équipe. Coordinat°  et rapidité pour écraser l’équipe adverse.',
    tag: 'Bientôt',
    tagColor: 'blue',
  },
]

/* ─── Main Lobby ─── */
export default function Lobby() {
  const navigate = useNavigate()
  const { categories: availableCategories } = useCategories()
  const [arenas, setArenas] = useState<ArenaItem[]>([])
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedRuleForModal, setSelectedRuleForModal] = useState<GameRule | null>(null)
  const [arenaToDelete, setArenaToDelete] = useState<ArenaItem | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [activeRuleTab, setActiveRuleTab] = useState<'all' | 'favorites'>('all')

  useEffect(() => {
    const userStr = localStorage.getItem('auth_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setAuthUser(user)
        setIsConnected(true)
      } catch (e) {}
    }

    const token = localStorage.getItem('auth_token')
    if (token) {
      fetch('/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && !data.error) {
            setAuthUser(data)
            setIsConnected(true)
            localStorage.setItem('auth_user', JSON.stringify(data))
          }
        })
        .catch(() => {})
    }
  }, [])

  const fetchArenas = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true)
    else setFetchState('loading')
    try {
      const res = await fetch('/arenas')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ArenaItem[] = await res.json()
      setArenas(data)
      setFetchState('success')
    } catch {
      setFetchState('error')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchArenas() }, [fetchArenas])

  const handleCreateArena = async (settings: CreateArenaSettings) => {
    const res = await fetch('/arenas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: settings.name,
        difficulty: settings.difficulty,
        gameMode: 'flashguess',
        categories: settings.categories,
        infiniteRounds: settings.infiniteRounds,
        roundCount: settings.roundCount,
        timePerRound: settings.timePerRound,
        maxPoints: settings.maxPoints,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const catDiffsStr = Object.entries(settings.categoryDifficulties)
      .map(([cat, diffs]) => `${cat}:${(diffs ?? []).join('+')}`)
      .join(',')

    const query = new URLSearchParams({
      difficulty: settings.difficulty,
      categories: settings.categories.join(','),
      rounds: settings.infiniteRounds ? 'infinite' : String(settings.roundCount),
      time: String(settings.timePerRound),
      maxPoints: String(settings.maxPoints),
      infiniteRounds: String(settings.infiniteRounds),
      catDiffs: catDiffsStr,
    })
    navigate(`/arena/${data.id}?${query.toString()}`)
  }

  const handleDeleteArena = async () => {
    if (!arenaToDelete) return
    const token = localStorage.getItem('auth_token')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(`/arenas/${arenaToDelete.id}`, {
      method: 'DELETE',
      headers,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setArenas(prev => prev.filter(a => a.id !== arenaToDelete.id))
  }

  const toggleFavorite = (id: string) => {
    if (!isConnected) return
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const categoryRules: GameRule[] = availableCategories.map(cat => ({
    id: `cat-${cat}`,
    name: `${getCategoryIcon(cat)} Spécial ${getCategoryLabel(cat)}`,
    description: `Session 100% axée sur le thème "${getCategoryLabel(cat)}".`,
    pointsTotal: 1000,
    difficulty: 'moyen',
    roundCount: 10,
    timePerRound: 20,
    infiniteRounds: false,
    categories: [cat],
  }))

  const allRules = [...GAME_RULES, ...categoryRules]

  const displayedRules = activeRuleTab === 'favorites'
    ? allRules.filter(r => favorites.has(r.id))
    : allRules

  const isUserAdmin = Boolean(authUser?.isAdmin || (authUser?.username && authUser.username.toLowerCase() === 'smikens'))

  return (
    <div className="lobby">
      <div className="lobby-bg-orb lobby-bg-orb--1" />
      <div className="lobby-bg-orb lobby-bg-orb--2" />
      <div className="lobby-bg-orb lobby-bg-orb--3" />

      {/* ─── Navbar ─── */}
      <nav className="lobby-nav" id="lobby-nav">
        {isConnected && authUser ? (
          <div className="lobby-nav-user">
            {isUserAdmin && (
              <button
                className="admin-pill-badge"
                id="admin-button"
                onClick={() => navigate('/admin')}
                title="Accéder au panneau d'administration"
              >
                <IconShield />
                Admin
              </button>
            )}
            <button className="btn-login" id="profile-button" onClick={() => navigate('/profile')}>
              <IconUser />
              {authUser.username}
            </button>
          </div>
        ) : (
          <button className="btn-login" id="login-button" onClick={() => navigate('/login')}>
            <IconLogin />
            Se connecter
          </button>
        )}
      </nav>

      {/* ─── Header ─── */}
      <header className="lobby-header" id="lobby-header">
        <div className="lobby-brand">
          <div className="lobby-brand-icon"><IconGamepad /></div>
          <h1 className="lobby-title">
            Smik <span className="lobby-title-accent">Party</span>
          </h1>
        </div>
        <p className="lobby-subtitle">
          Testez vos connaissances en temps réel. Rejoignez une arène et prouvez que vous êtes le plus rapide.
        </p>
      </header>

      {/* ─── Slider ─── */}
      <div className="lobby-slider-zone" id="lobby-slider-zone">
        <Slider
          slides={LOBBY_SLIDES}
          cardWidth={200}
          cardHeight={110}
          gap={10}
          duration={28}
        />
      </div>

      {/* ─── Main ─── */}
      <main className="lobby-main" id="lobby-main">

        {/* Arenas panel */}
        <div className="lobby-panel" id="arenas-panel">
          <div className="lobby-panel-header">
            <div className="lobby-panel-title-group">
              <h2 className="lobby-panel-title">Parties en cours</h2>
              {fetchState === 'success' && (
                <span className="lobby-panel-count">{arenas.length} arène{arenas.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="lobby-panel-actions">
              <button
                className="btn-create"
                onClick={() => setShowCreateModal(true)}
                id="create-arena-button"
              >
                <IconZap />
                Nouvelle arène
              </button>
              <button
                className={`btn-refresh ${isRefreshing ? 'is-loading' : ''}`}
                onClick={() => fetchArenas(true)}
                disabled={isRefreshing}
                id="refresh-button"
              >
                <IconRefresh />
                {isRefreshing ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>
          </div>

          {fetchState === 'loading' && <SkeletonList />}

          {fetchState === 'error' && (
            <div className="error-banner fade-in" role="alert">
              <IconAlertCircle />
              <span className="error-banner-text">
                Impossible de joindre le serveur. Vérifiez que l'API tourne sur le port 3000.
              </span>
              <button className="error-banner-retry" onClick={() => fetchArenas()}>Réessayer</button>
            </div>
          )}

          {fetchState === 'success' && arenas.length === 0 && (
            <div className="empty-state fade-in">
              <div className="empty-state-icon"><IconInbox /></div>
              <h3 className="empty-state-title">Aucune arène active</h3>
              <p className="empty-state-text">Soyez le premier à créer une arène !</p>
              <button
                className="btn-create empty-state-cta"
                onClick={() => setShowCreateModal(true)}
                id="create-from-empty"
              >
                <IconZap /> Créer une arène
              </button>
            </div>
          )}

          {fetchState === 'success' && arenas.length > 0 && (
            <div className="arena-list" id="arena-list">
              {arenas.map((a) => (
                <ArenaCard
                  key={a.id}
                  arena={a}
                  isAdmin={isUserAdmin}
                  onJoin={id => navigate(`/arena/${id}`)}
                  onDelete={arena => setArenaToDelete(arena)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Game modes section */}
        <section className="games-section" id="games-section">
          <div className="games-section-header">
            <div className="games-section-title-group">
              <div className="games-section-icon"><IconBookOpen /></div>
              <div>
                <h2 className="games-section-title">Modes de jeu</h2>
                <p className="games-section-subtitle">Règles disponibles — choisissez votre style</p>
              </div>
            </div>

            <div className="games-tabs" id="games-tabs">
              <button
                className={`games-tab ${activeRuleTab === 'all' ? 'games-tab--active' : ''}`}
                onClick={() => setActiveRuleTab('all')}
                id="tab-all-rules"
              >
                Tous
              </button>
              <button
                className={`games-tab ${activeRuleTab === 'favorites' ? 'games-tab--active' : ''}`}
                onClick={() => isConnected ? setActiveRuleTab('favorites') : navigate('/login')}
                id="tab-favorites"
              >
                <IconHeart />
                Favoris
                {!isConnected && <span className="games-tab-lock"><IconLock /></span>}
              </button>
            </div>
          </div>

          {!isConnected && activeRuleTab === 'favorites' && (
            <div className="games-login-prompt fade-in">
              <div className="games-login-prompt-icon"><IconLock /></div>
              <p className="games-login-prompt-text">Connectez-vous pour accéder à vos règles favorites.</p>
              <button className="btn-login-prompt" onClick={() => navigate('/login')} id="login-prompt-button">
                <IconLogin /> Se connecter
              </button>
            </div>
          )}

          {(activeRuleTab === 'all' || isConnected) && (
            <div className="game-rules-grid" id="game-rules-grid">
              {displayedRules.length === 0 && activeRuleTab === 'favorites' && (
                <div className="empty-state fade-in" style={{ gridColumn: '1/-1' }}>
                  <div className="empty-state-icon"><IconHeart /></div>
                  <h3 className="empty-state-title">Aucun favori</h3>
                  <p className="empty-state-text">Cliquez sur ♥ d'un mode pour l'ajouter ici.</p>
                </div>
              )}
              {displayedRules.map(rule => (
                <GameRuleCard
                  key={rule.id}
                  rule={rule}
                  isConnected={isConnected}
                  isFavorite={favorites.has(rule.id)}
                  onToggleFavorite={toggleFavorite}
                  onSelectRule={r => {
                    setSelectedRuleForModal(r)
                    setShowCreateModal(true)
                  }}
                />
              ))}
              {activeRuleTab === 'all' && (
                <div className="game-rule-card game-rule-card--add" id="add-game-rule">
                  <div className="game-rule-add-icon">+</div>
                  <p className="game-rule-add-text">Nouveau mode à venir</p>
                  <span className="game-rule-add-badge">Bientôt</span>
                </div>
              )}
            </div>
          )}

          <button className="games-more-link" id="games-more-link">
            Voir tous les modes <IconChevronRight />
          </button>
        </section>
      </main>

      <footer className="lobby-footer" id="lobby-footer">
        <p className="lobby-footer-text">Smik Party — Projet open source</p>
      </footer>

      {/* Modal de création */}
      {showCreateModal && (
        <CreateArenaModal
          availableCategories={availableCategories}
          initialRule={selectedRuleForModal}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedRuleForModal(null)
          }}
          onCreate={handleCreateArena}
        />
      )}

      {/* Modal de suppression (Admin) */}
      {arenaToDelete && (
        <DeleteArenaModal
          arena={arenaToDelete}
          onClose={() => setArenaToDelete(null)}
          onConfirm={handleDeleteArena}
        />
      )}
    </div>
  )
}
