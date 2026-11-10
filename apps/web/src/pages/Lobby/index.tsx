import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  IconGamepad, IconRefresh, IconZap, IconUser,
  IconInbox, IconAlertCircle, IconLogin,
  IconBookOpen, IconHeart, IconLock, IconChevronRight, IconTarget, IconTrophy, IconX,
  IconInfinity, IconClock, IconTemplate, IconCheck
} from '../../components/Icons'
import { DIFFICULTY_LABELS, CATEGORY_LABELS, ALL_CATEGORIES, CATEGORY_ICONS, DEFAULT_CATEGORY_DIFFICULTIES } from '../../types'
import type { Difficulty, GameSettings } from '../../types'
import Slider from '../../components/Slider/Slider'
import type { SlideItem } from '../../components/Slider/Slider'
import AudioThemeControls from '../../components/AudioThemeControls'
import TemplateModal from '../../components/TemplateModal/TemplateModal'
import { fetchTemplateByCode } from '../../utils/templateApi'
import { serializeCategoryListMap } from '../../utils/tagFilter'
import { soundManager } from '../../utils/sound'
import { API_URL } from '../../utils/config'
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
  categories?: string[]
  categoryDifficulties: Record<string, Difficulty[]>
  categoryTags?: Record<string, string[]>
  bannedCategoryTags?: Record<string, string[]>
  tags?: string[]
  bannedTags?: string[]
  infiniteRounds: boolean
  roundCount: number
  timePerRound: number
  maxPoints: number
  maxPlayers: number
}

function buildPrefilledArenaSettings(tplSettings: GameSettings, name: string): Partial<CreateArenaSettings> {
  return {
    name,
    difficulty: tplSettings.difficulty ?? 'moyen',
    categories: tplSettings.categories,
    categoryDifficulties: tplSettings.categoryDifficulties ?? DEFAULT_CATEGORY_DIFFICULTIES,
    categoryTags: tplSettings.categoryTags ?? {},
    bannedCategoryTags: tplSettings.bannedCategoryTags ?? {},
    tags: tplSettings.tags ?? [],
    bannedTags: tplSettings.bannedTags ?? [],
    infiniteRounds: tplSettings.infiniteRounds ?? false,
    roundCount: tplSettings.roundCount ?? 10,
    timePerRound: tplSettings.timePerRound ?? 20,
    maxPoints: tplSettings.maxPoints ?? 1000,
    maxPlayers: tplSettings.maxPlayers ?? 8,
  }
}

/* ─── Create Arena Modal ─── */
function CreateArenaModal({
  onClose,
  onCreate,
  initialSettings,
}: {
  onClose: () => void
  onCreate: (settings: CreateArenaSettings) => Promise<void>
  initialSettings?: Partial<CreateArenaSettings>
}) {
  const [name, setName] = useState(initialSettings?.name ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(initialSettings?.difficulty ?? 'moyen')
  const [categories, setCategories] = useState<string[] | undefined>(initialSettings?.categories)
  const [categoryDifficulties, setCategoryDifficulties] = useState<Record<string, Difficulty[]>>(
    initialSettings?.categoryDifficulties ?? DEFAULT_CATEGORY_DIFFICULTIES
  )
  const [categoryTags, setCategoryTags] = useState<Record<string, string[]>>(
    initialSettings?.categoryTags ?? {}
  )
  const [bannedCategoryTags, setBannedCategoryTags] = useState<Record<string, string[]>>(
    initialSettings?.bannedCategoryTags ?? {}
  )
  const [bannedTags, setBannedTags] = useState<string[]>(initialSettings?.bannedTags ?? [])
  const [infiniteRounds, setInfiniteRounds] = useState(initialSettings?.infiniteRounds ?? false)
  const [roundCount, setRoundCount] = useState(initialSettings?.roundCount ?? 10)
  const [timePerRound, setTimePerRound] = useState(initialSettings?.timePerRound ?? 20)
  const [maxPoints, setMaxPoints] = useState(initialSettings?.maxPoints ?? 1000)
  const [maxPlayers, setMaxPlayers] = useState(initialSettings?.maxPlayers ?? 8)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateModalTab, setTemplateModalTab] = useState<'my' | 'public' | 'code' | 'save'>('my')
  const [templateToast, setTemplateToast] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Focus ONLY on initial mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Safely handle escape key without resetting on parent re-renders
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTemplateModalOpen) {
        onCloseRef.current()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isTemplateModalOpen])

  const handleGlobalDifficultyChange = (d: Difficulty | 'all') => {
    if (d !== 'all') setDifficulty(d)
    const targetDiffs = d === 'all' ? ['facile', 'moyen', 'difficile'] as Difficulty[] : [d]
    setCategoryDifficulties(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(k => { next[k] = targetDiffs })
      return next
    })
  }

  const toggleCategoryDiff = (cat: string, diff: Difficulty) => {
    setCategoryDifficulties(prev => {
      const current = prev[cat] ?? ['facile', 'moyen', 'difficile']
      const has = current.includes(diff)
      if (has && current.length === 1) return prev
      const updated = has ? current.filter(d => d !== diff) : [...current, diff]
      return { ...prev, [cat]: updated }
    })
  }

  const setCategoryAllDiffs = (cat: string) => {
    setCategoryDifficulties(prev => ({ ...prev, [cat]: ['facile', 'moyen', 'difficile'] }))
  }

  const handleApplyTemplate = (tplSettings: GameSettings, templateName: string) => {
    if (!name.trim()) setName(templateName)
    if (tplSettings.difficulty) setDifficulty(tplSettings.difficulty)
    if (tplSettings.categories) setCategories(tplSettings.categories)
    if (tplSettings.categoryDifficulties) setCategoryDifficulties(tplSettings.categoryDifficulties)
    setCategoryTags(tplSettings.categoryTags ?? {})
    setBannedCategoryTags(tplSettings.bannedCategoryTags ?? {})
    setBannedTags(tplSettings.bannedTags ?? [])
    if (tplSettings.infiniteRounds !== undefined) setInfiniteRounds(tplSettings.infiniteRounds)
    if (tplSettings.roundCount !== undefined) setRoundCount(tplSettings.roundCount)
    if (tplSettings.timePerRound !== undefined) setTimePerRound(tplSettings.timePerRound)
    if (tplSettings.maxPoints !== undefined) setMaxPoints(tplSettings.maxPoints)
    if (tplSettings.maxPlayers !== undefined) setMaxPlayers(tplSettings.maxPlayers)
    setTemplateToast(`Modèle "${templateName}" appliqué !`)
    setTimeout(() => setTemplateToast(null), 3000)
  }

  const currentSettingsForTemplate: GameSettings = {
    categories: categories ?? Object.keys(categoryDifficulties),
    difficulty,
    categoryDifficulties,
    categoryTags,
    bannedCategoryTags,
    bannedTags,
    roundCount,
    timePerRound,
    maxPoints,
    infiniteRounds,
    pointsPerAnswer: 100,
    maxPlayers,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Le nom de l\'arène est requis.'); return }
    setIsSubmitting(true)
    setError('')
    try {
      await onCreate({
        name: trimmed,
        difficulty,
        categories,
        categoryDifficulties,
        categoryTags,
        bannedCategoryTags,
        bannedTags,
        infiniteRounds,
        roundCount,
        timePerRound,
        maxPoints,
        maxPlayers,
      })
    } catch {
      setError('Impossible de créer l\'arène. Le serveur est-il démarré ?')
      setIsSubmitting(false)
    }
  }

  return (
    <>
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
            {/* Template Toolbar */}
            <div className="modal-template-toolbar">
              <button
                type="button"
                className="btn-tpl-bar"
                onClick={() => { setTemplateModalTab('my'); setIsTemplateModalOpen(true) }}
              >
                <IconTemplate /> Charger un modèle
              </button>
              <button
                type="button"
                className="btn-tpl-bar btn-tpl-bar--save"
                onClick={() => { setTemplateModalTab('save'); setIsTemplateModalOpen(true) }}
              >
                💾 Sauvegarder ce modèle
              </button>
            </div>

            {/* Template Toast */}
            {templateToast && (
              <div className="template-toast fade-in">
                <IconCheck /> {templateToast}
              </div>
            )}

            {/* Arena Name */}
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
              />
              <span className="modal-input-counter">{name.length}/40</span>
            </div>

          {/* Difficulty Presets */}
          <div className="modal-field">
            <label className="modal-label">Niveaux de difficulté par défaut</label>
            <div className="modal-diff-row">
              {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  type="button"
                  className={`modal-diff-btn ${difficulty === d ? 'modal-diff-btn--active ' + DIFFICULTY_COLOR[d] : ''}`}
                  onClick={() => handleGlobalDifficultyChange(d)}
                  id={`modal-diff-${d}`}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
              <button
                type="button"
                className="modal-diff-btn"
                onClick={() => handleGlobalDifficultyChange('all')}
                id="modal-diff-all"
              >
                ✨ Tous
              </button>
            </div>
          </div>

          {/* Difficulty per category */}
          <div className="modal-field">
            <div className="settings-label-row">
              <label className="modal-label">Difficultés par catégorie (sélectionnez 1, 2 ou toutes)</label>
            </div>
            <div className="category-diff-list">
              {ALL_CATEGORIES.map(cat => {
                const currentDiffs = categoryDifficulties[cat] ?? ['facile', 'moyen', 'difficile']
                const isAllSelected = currentDiffs.length === 3
                return (
                  <div key={cat} className="category-card category-card--active">
                    <div className="category-card-header">
                      <div className="category-card-title-group">
                        <span className="category-emoji">{CATEGORY_ICONS[cat]}</span>
                        <span className="category-card-name">{CATEGORY_LABELS[cat]}</span>
                      </div>
                    </div>
                    <div className="category-card-diff-pills">
                      {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => {
                        const active = currentDiffs.includes(d)
                        return (
                          <button
                            key={d}
                            type="button"
                            className={`cat-diff-pill ${active ? 'cat-diff-pill--active diff--' + d : ''}`}
                            onClick={() => toggleCategoryDiff(cat, d)}
                            id={`modal-cat-diff-${cat}-${d}`}
                          >
                            {d === 'facile' ? '🟢 Easy' : d === 'moyen' ? '🟡 Normal' : '🔴 Hard'}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        className={`cat-diff-pill ${isAllSelected ? 'cat-diff-pill--active' : ''}`}
                        onClick={() => setCategoryAllDiffs(cat)}
                        id={`modal-cat-diff-${cat}-all`}
                      >
                        ✨ Tous
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Round mode */}
          <div className="modal-field">
            <label className="modal-label">Mode de manches</label>
            <div className="modal-mode-switch">
              <button
                type="button"
                className={`modal-mode-btn ${!infiniteRounds ? 'modal-mode-btn--active' : ''}`}
                onClick={() => setInfiniteRounds(false)}
                id="mode-fixed-rounds"
              >
                <IconZap /> Manches fixes
              </button>
              <button
                type="button"
                className={`modal-mode-btn ${infiniteRounds ? 'modal-mode-btn--active' : ''}`}
                onClick={() => setInfiniteRounds(true)}
                id="mode-infinite-rounds"
              >
                <IconInfinity /> Manches infinies
              </button>
            </div>
          </div>

          {/* Infinite rounds notice */}
          {infiniteRounds && (
            <div className="modal-infinite-notice fade-in">
              <IconInfinity />
              <span>Mode infini activé — Victoire au 1er joueur à <strong>{maxPoints} pts</strong></span>
            </div>
          )}

          {/* Round count (if not infinite) */}
          {!infiniteRounds && (
            <div className="modal-field fade-in">
              <label className="modal-label">Nombre de manches</label>
              <div className="modal-options-pills">
                {[5, 10, 15, 20, 30].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`modal-option-pill ${roundCount === n ? 'modal-option-pill--active' : ''}`}
                    onClick={() => setRoundCount(n)}
                    id={`modal-rounds-${n}`}
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
                    value={roundCount}
                    onChange={e => setRoundCount(Number(e.target.value))}
                    className="settings-range-slider"
                    id="modal-rounds-slider"
                  />
                  <span className="slider-val-badge">{roundCount} manche{roundCount > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}

          {/* Time per round */}
          <div className="modal-field">
            <label className="modal-label">Temps par question</label>
            <div className="modal-options-pills">
              {[5, 10, 15, 20, 30, 45, 60].map(t => (
                <button
                  key={t}
                  type="button"
                  className={`modal-option-pill ${timePerRound === t ? 'modal-option-pill--active' : ''}`}
                  onClick={() => setTimePerRound(t)}
                  id={`modal-time-${t}`}
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
                  value={timePerRound}
                  onChange={e => setTimePerRound(Number(e.target.value))}
                  className="settings-range-slider"
                  id="modal-time-slider"
                />
                <span className="slider-val-badge">{timePerRound}s</span>
              </div>
            </div>
          </div>

          {/* Score maximum (Limit of points) */}
          <div className="modal-field">
            <label className="modal-label">Score maximum (Limite de points)</label>
            <div className="modal-pts-input-row">
              <div className="modal-pts-input-group">
                <input
                  id="modal-max-points-input"
                  type="number"
                  min={100}
                  max={99999}
                  step={50}
                  value={maxPoints}
                  onChange={e => setMaxPoints(Math.max(100, Math.min(99999, Number(e.target.value) || 100)))}
                  className="modal-pts-input"
                />
                <span className="modal-pts-unit">pts</span>
              </div>
              <div className="modal-options-pills" style={{ flex: 1 }}>
                {[500, 1000, 2000, 5000].map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`modal-option-pill ${maxPoints === p ? 'modal-option-pill--active' : ''}`}
                    onClick={() => setMaxPoints(p)}
                    id={`modal-maxpts-${p}`}
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
                  value={maxPoints}
                  onChange={e => setMaxPoints(Number(e.target.value))}
                  className="settings-range-slider"
                  id="modal-maxpts-slider"
                />
                <span className="slider-val-badge">{maxPoints.toLocaleString('fr-FR')} pts</span>
              </div>
            </div>
          </div>

          {/* Player limit */}
          <div className="modal-field">
            <div className="settings-label-row">
              <label className="modal-label">Limite de joueurs</label>
              <span className="modal-input-counter">
                {maxPlayers === 0 ? 'Illimité (∞)' : `${maxPlayers} joueur${maxPlayers > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="modal-options-pills">
              <button
                type="button"
                className={`modal-option-pill ${maxPlayers === 0 ? 'modal-option-pill--active' : ''}`}
                onClick={() => setMaxPlayers(0)}
                id="modal-maxplayers-0"
              >
                ∞ Illimité
              </button>
              {[2, 4, 6, 8, 10, 16, 20].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`modal-option-pill ${maxPlayers === n ? 'modal-option-pill--active' : ''}`}
                  onClick={() => setMaxPlayers(n)}
                  id={`modal-maxplayers-${n}`}
                >
                  {n}
                </button>
              ))}
            </div>
            {maxPlayers > 0 ? (
              <div className="slider-control-group" style={{ marginTop: '8px' }}>
                <div className="slider-input-row">
                  <input
                    type="range"
                    min={2}
                    max={50}
                    step={1}
                    value={Math.min(50, Math.max(2, maxPlayers))}
                    onChange={e => setMaxPlayers(Number(e.target.value))}
                    className="settings-range-slider"
                    id="modal-maxplayers-slider"
                  />
                  <span className="slider-val-badge">{maxPlayers} joueur{maxPlayers > 1 ? 's' : ''}</span>
                </div>
              </div>
            ) : (
              <p className="settings-hint" style={{ marginTop: '6px' }}>
                Aucune restriction : un nombre infini de participants peuvent rejoindre la partie.
              </p>
            )}
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

    <TemplateModal
      isOpen={isTemplateModalOpen}
      onClose={() => setIsTemplateModalOpen(false)}
      currentSettings={currentSettingsForTemplate}
      onApplyTemplate={handleApplyTemplate}
      initialTab={templateModalTab}
    />
  </>
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
  isAdmin,
  onDelete,
}: {
  arena: ArenaItem
  onJoin: (id: string) => void
  isAdmin?: boolean
  onDelete?: (id: string, name: string) => void
}) {
  const isLive = arena.status === 'playing'
  const isFull = arena.maxPlayers > 0 && arena.players >= arena.maxPlayers
  const statusClass = isLive ? 'status-badge--live' : isFull ? 'status-badge--full' : 'status-badge--waiting'
  const statusLabel = isLive ? 'En cours' : isFull ? 'Complet' : 'En attente'
  const isInfinite = arena.infiniteRounds || arena.roundCount === 0
  const roundsDisplay = isInfinite ? '∞ manches' : `${arena.roundCount ?? 10} manches`

  return (
    <div
      className={`arena-card ${isFull ? 'arena-card--full' : ''}`}
      id={`arena-${arena.id}`}
      onClick={() => { if (!isFull) onJoin(arena.id) }}
      style={{ cursor: isFull ? 'not-allowed' : 'pointer' }}
    >
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
        <span className="player-count">
          <IconUser />
          {arena.players}/{arena.maxPlayers === 0 ? '∞' : arena.maxPlayers}
        </span>
        <span className={`status-badge ${statusClass}`}>
          <span className="status-dot" />
          {statusLabel}
        </span>
        <button
          className={`btn-join ${isFull ? 'btn-join--disabled' : ''}`}
          id={`join-${arena.id}`}
          disabled={isFull}
          title={isFull ? 'Cette arène est complète' : 'Rejoindre'}
        >
          {isFull ? 'Complet' : 'Rejoindre'}
        </button>
        {isAdmin && onDelete && (
          <button
            type="button"
            className="btn-delete-arena"
            id={`delete-${arena.id}`}
            title="Supprimer cette arène (Admin)"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(arena.id, arena.name)
            }}
          >
            🗑️
          </button>
        )}
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
}: {
  rule: GameRule
  isConnected: boolean
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  const isInfinite = rule.infiniteRounds || rule.roundCount === 0
  return (
    <div className={`game-rule-card ${isFavorite ? 'game-rule-card--fav' : ''}`} id={`rule-${rule.id}`}>
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
            onClick={() => onToggleFavorite(rule.id)}
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
  const [searchParams] = useSearchParams()
  const [arenas, setArenas] = useState<ArenaItem[]>([])
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [prefilledSettings, setPrefilledSettings] = useState<Partial<CreateArenaSettings> | undefined>(undefined)

  const [isConnected, setIsConnected] = useState(false)
  const [authUser, setAuthUser] = useState<any>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [activeRuleTab, setActiveRuleTab] = useState<'all' | 'favorites'>('all')

  // Check URL query parameters for template code (e.g. ?template=TMPL-XXXX)
  useEffect(() => {
    const tmplCode = searchParams.get('template')
    if (tmplCode) {
      fetchTemplateByCode(tmplCode, true)
        .then(tpl => {
          setPrefilledSettings(buildPrefilledArenaSettings(tpl.settings, tpl.name))
          setShowCreateModal(true)
        })
        .catch(err => console.error('Failed to prefill template from URL:', err))
    }
  }, [searchParams])

  useEffect(() => {
    const userStr = localStorage.getItem('auth_user')
    const token = localStorage.getItem('auth_token')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setAuthUser(user)
        setIsConnected(true)
      } catch (e) {}
    }
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const handleDeleteArena = async (id: string, name: string) => {
    if (!window.confirm(`⚠️ Voulez-vous vraiment supprimer l'arène "${name}" ?`)) {
      return
    }
    const token = localStorage.getItem('auth_token')
    try {
      const res = await fetch(`${API_URL}/arenas/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setArenas(prev => prev.filter(a => a.id !== id))
      } else {
        alert(`Erreur : ${data.error || 'Impossible de supprimer l\'arène'}`)
      }
    } catch (err) {
      alert(`Erreur lors de la suppression de l'arène : ${String(err)}`)
    }
  }

  const fetchArenas = useCallback(async (mode?: 'manual' | 'silent') => {
    if (mode === 'manual') setIsRefreshing(true)
    else if (!mode) setFetchState('loading')
    try {
      const res = await fetch(`${API_URL}/arenas`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ArenaItem[] = await res.json()
      setArenas(data)
      setFetchState('success')
    } catch {
      if (!mode) setFetchState('error')
    } finally {
      if (mode === 'manual') setIsRefreshing(false)
    }
  }, [])

  const handleCloseCreateModal = useCallback(() => {
    setShowCreateModal(false)
    setPrefilledSettings(undefined)
  }, [])

  useEffect(() => {
    fetchArenas()
    const interval = setInterval(() => {
      // Pause background polling while a modal is open so focus is never lost
      if (!showCreateModal && !showTemplateModal) {
        fetchArenas('silent')
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchArenas, showCreateModal, showTemplateModal])

  const handleCreateArena = async (settings: CreateArenaSettings) => {
    const res = await fetch(`${API_URL}/arenas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: settings.name,
        difficulty: settings.difficulty,
        gameMode: 'flashguess',
        infiniteRounds: settings.infiniteRounds,
        roundCount: settings.roundCount,
        timePerRound: settings.timePerRound,
        maxPoints: settings.maxPoints,
        maxPlayers: settings.maxPlayers,
        tags: settings.tags ?? [],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const catDiffsStr = serializeCategoryListMap(settings.categoryDifficulties, settings.categories)
    const catTagsStr = serializeCategoryListMap(settings.categoryTags, settings.categories)
    const bannedCatTagsStr = serializeCategoryListMap(settings.bannedCategoryTags, settings.categories)

    const query = new URLSearchParams({
      difficulty: settings.difficulty,
      ...(settings.categories && settings.categories.length > 0 ? { categories: settings.categories.join(',') } : {}),
      rounds: settings.infiniteRounds ? 'infinite' : String(settings.roundCount),
      time: String(settings.timePerRound),
      maxPoints: String(settings.maxPoints),
      infiniteRounds: String(settings.infiniteRounds),
      maxPlayers: String(settings.maxPlayers),
      catDiffs: catDiffsStr,
      ...(catTagsStr ? { catTags: catTagsStr } : {}),
      ...(bannedCatTagsStr ? { bannedCatTags: bannedCatTagsStr } : {}),
      ...(settings.tags && settings.tags.length > 0 ? { tags: settings.tags.join(',') } : {}),
      ...(settings.bannedTags && settings.bannedTags.length > 0 ? { bannedTags: settings.bannedTags.join(',') } : {}),
    })
    navigate(`/arena/${data.id}?${query.toString()}`)
  }

  const toggleFavorite = (id: string) => {
    soundManager.playClick()
    if (!isConnected) return
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const displayedRules = activeRuleTab === 'favorites'
    ? GAME_RULES.filter(r => favorites.has(r.id))
    : GAME_RULES

  return (
    <div className="lobby">
      <div className="lobby-bg-orb lobby-bg-orb--1" />
      <div className="lobby-bg-orb lobby-bg-orb--2" />
      <div className="lobby-bg-orb lobby-bg-orb--3" />

      {/* ─── Navbar ─── */}
      <nav className="lobby-nav" id="lobby-nav">
        <AudioThemeControls />
        {isConnected && authUser?.isAdmin && (
          <button
            className="btn-login"
            id="admin-button"
            onClick={() => navigate('/admin')}
            title="Administration & Importation de questions"
          >
            <span style={{ fontSize: '14px' }}>📊</span> Admin
          </button>
        )}
        {isConnected && authUser ? (
          <button className="btn-login" id="profile-button" onClick={() => navigate('/profile')}>
            <IconUser />
            {authUser.username}
          </button>
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
                className="btn-header-templates"
                onClick={() => setShowTemplateModal(true)}
                id="open-templates-button"
                title="Explorer et gérer les modèles de partie"
              >
                <IconTemplate />
                Modèles
              </button>
              <button
                className="btn-create"
                onClick={() => { setPrefilledSettings(undefined); setShowCreateModal(true) }}
                id="create-arena-button"
              >
                <IconZap />
                Nouvelle arène
              </button>
              <button
                className={`btn-refresh ${isRefreshing ? 'is-loading' : ''}`}
                onClick={() => fetchArenas('manual')}
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
                  isAdmin={Boolean(isConnected && authUser?.isAdmin)}
                  onJoin={id => navigate(`/arena/${id}`)}
                  onDelete={handleDeleteArena}
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

      {/* Create Arena Modal */}
      {showCreateModal && (
        <CreateArenaModal
          initialSettings={prefilledSettings}
          onClose={handleCloseCreateModal}
          onCreate={handleCreateArena}
        />
      )}

      {/* Standalone Template Catalog Modal */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        initialTab="public"
        onApplyTemplate={(tplSettings, templateName) => {
          setPrefilledSettings(buildPrefilledArenaSettings(tplSettings, templateName))
          setShowTemplateModal(false)
          setShowCreateModal(true)
        }}
      />
    </div>
  )
}
