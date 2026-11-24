/* ─── Smik Party - Shared Types ─── */

export type Difficulty = 'facile' | 'moyen' | 'difficile' | 'easy' | 'normal' | 'hard'

export type Category = string

export interface CategoryTag {
  name: string
  count: number
}

export interface CategoryInfo {
  id: string
  name: string
  icon: string
  count: number
  tags: CategoryTag[]
  tagChildren?: Record<string, CategoryTag[]>
}

export const ALL_CATEGORIES: string[] = [
  'mythologie', 'capitale', 'geographie', 'histoire', 'sciences', 'cinema',
  'musique', 'sport', 'litterature', 'gastronomie', 'drapeau',
]

export const CATEGORY_ICONS: Record<string, string> = {
  mythologie: '🏛️',
  'mythologie & légende': '🏛️',
  'mythologie & légendes': '🏛️',
  'mythologie-legende': '🏛️',
  capitale: '🌍',
  capitales: '🌍',
  drapeau: '🚩',
  drapeaux: '🚩',
  geographie: '🗺️',
  histoire: '📜',
  sciences: '🔬',
  cinema: '🎬',
  musique: '🎵',
  sport: '⚽',
  sports: '⚽',
  litterature: '📚',
  gastronomie: '🍽️',
  warframe: '⚔️',
  'anime & manga': '🎌',
  'anime-manga': '🎌',
  'animaux & dinosaures': '🦕',
  'animaux-dinosaures': '🦕',
  'jeux vidéo': '🎮',
  'jeux video': '🎮',
  'jeux-video': '🎮',
}

export const CATEGORY_LABELS: Record<string, string> = {
  mythologie: 'Mythologie & Légendes',
  'mythologie & légende': 'Mythologie & Légendes',
  'mythologie & légendes': 'Mythologie & Légendes',
  'mythologie-legende': 'Mythologie & Légendes',
  capitale: 'Capitales',
  capitales: 'Capitales',
  drapeau: 'Drapeaux',
  drapeaux: 'Drapeaux',
  geographie: 'Géographie',
  histoire: 'Histoire',
  sciences: 'Sciences',
  cinema: 'Cinéma',
  musique: 'Musique',
  sport: 'Sport',
  sports: 'Sports',
  litterature: 'Littérature',
  gastronomie: 'Gastronomie',
  warframe: 'Warframe',
  'anime & manga': 'Anime & Manga',
  'anime-manga': 'Anime & Manga',
  'animaux & dinosaures': 'Animaux & Dinosaures',
  'animaux-dinosaures': 'Animaux & Dinosaures',
  'jeux vidéo': 'Jeux Vidéo',
  'jeux video': 'Jeux Vidéo',
  'jeux-video': 'Jeux Vidéo',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facile: 'Easy (Facile)',
  easy: 'Easy (Facile)',
  moyen: 'Normal (Moyen)',
  normal: 'Normal (Moyen)',
  difficile: 'Hard (Difficile)',
  hard: 'Hard (Difficile)',
}

export const DIFFICULTY_SHORT_LABELS: Record<Difficulty, string> = {
  facile: 'Easy',
  easy: 'Easy',
  moyen: 'Normal',
  normal: 'Normal',
  difficile: 'Hard',
  hard: 'Hard',
}

export const DIFFICULTY_EMOJI: Record<Difficulty, string> = {
  facile: '🟢',
  easy: '🟢',
  moyen: '🟡',
  normal: '🟡',
  difficile: '🔴',
  hard: '🔴',
}

export type CategoryDifficulty = Difficulty | 'mixte'

export const CATEGORY_DIFFICULTY_LABELS: Record<CategoryDifficulty, string> = {
  facile: 'Easy (Facile)',
  easy: 'Easy (Facile)',
  moyen: 'Normal (Moyen)',
  normal: 'Normal (Moyen)',
  difficile: 'Hard (Difficile)',
  hard: 'Hard (Difficile)',
  mixte: 'Mixte (Tous)',
}

export interface Question {
  id: number | string
  text: string
  answer?: string
  acceptedAnswers?: string[]
  imageUrl?: string | null
  category?: Category
  difficulty?: Difficulty | string
  tags?: string[]
  isMuted?: boolean
}

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  hasAnswered: boolean
  streak: number
}

export interface PlayerSummary {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  score: number
  streak: number
  bestStreak: number
  hasAnswered: boolean
  answeredCorrectly: boolean
  answerTime: number | null
  firstAnswersCount?: number
  correctAnswersCount?: number
  totalAnswersCount?: number
  averageReactionTime?: number | null
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  text: string
  timestamp: number
  isSystem?: boolean
}

export interface GameSettings {
  categories: Category[]
  difficulty: Difficulty
  difficulties?: Difficulty[]
  categoryDifficulties: Record<string, Difficulty[]>
  categoryTags: Record<string, string[]>        // category id -> selected tag names (empty = all questions)
  bannedCategoryTags?: Record<string, string[]> // category id -> banned tag names
  tags?: string[]
  bannedTags?: string[]
  roundCount: number
  timePerRound: number
  maxPoints: number
  infiniteRounds: boolean
  pointsPerAnswer: number   // points for the 1st (fastest) correct answer
  maxPlayers?: number
  speedrunMode?: boolean
  speedrunDifficulties?: ('facile' | 'moyen' | 'difficile' | 'easy' | 'normal' | 'hard' | string)[]
  speedrunTime?: number
  categorySpeedrunTimes?: Record<string, number>
  difficultySpeedrunTimes?: Record<string, number>
}

export interface TemplateAuthor {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
}

export interface GameTemplate {
  id: string
  name: string
  description?: string | null
  shareCode: string
  isPublic: boolean
  usageCount: number
  settings: GameSettings
  userId: string
  user?: TemplateAuthor
  createdAt: string
  updatedAt: string
}

export interface Arena {
  id: string
  name: string
  players: number
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  gameMode: 'flashguess'
  difficulty: Difficulty
  difficulties?: Difficulty[]
  categories: Category[]
  categoryDifficulties?: Record<string, Difficulty[]>
  categoryTags?: Record<string, string[]>
  bannedCategoryTags?: Record<string, string[]>
  tags?: string[]
  bannedTags?: string[]
  roundCount?: number
  timePerRound?: number
  maxPoints?: number
  infiniteRounds?: boolean
}

export const ALL_DIFFICULTIES: Difficulty[] = ['facile', 'moyen', 'difficile']

export const DEFAULT_CATEGORY_DIFFICULTIES: Record<string, Difficulty[]> = {
  mythologie: ['facile', 'moyen', 'difficile'],
  'mythologie & légende': ['facile', 'moyen', 'difficile'],
  'mythologie & légendes': ['facile', 'moyen', 'difficile'],
  capitale: ['facile', 'moyen', 'difficile'],
  capitales: ['facile', 'moyen', 'difficile'],
  drapeau: ['facile', 'moyen', 'difficile'],
  drapeaux: ['facile', 'moyen', 'difficile'],
  geographie: ['facile', 'moyen', 'difficile'],
  histoire: ['facile', 'moyen', 'difficile'],
  sciences: ['facile', 'moyen', 'difficile'],
  cinema: ['facile', 'moyen', 'difficile'],
  musique: ['facile', 'moyen', 'difficile'],
  sport: ['facile', 'moyen', 'difficile'],
  sports: ['facile', 'moyen', 'difficile'],
  litterature: ['facile', 'moyen', 'difficile'],
  gastronomie: ['facile', 'moyen', 'difficile'],
  warframe: ['facile', 'moyen', 'difficile'],
  'anime & manga': ['facile', 'moyen', 'difficile'],
  'animaux & dinosaures': ['facile', 'moyen', 'difficile'],
  'jeux vidéo': ['facile', 'moyen', 'difficile'],
  'jeux video': ['facile', 'moyen', 'difficile'],
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  categories: ['mythologie', 'capitale', 'geographie', 'histoire', 'sciences'],
  difficulty: 'facile',
  difficulties: ['facile', 'moyen', 'difficile'],
  categoryDifficulties: DEFAULT_CATEGORY_DIFFICULTIES,
  categoryTags: {},
  bannedCategoryTags: {},
  tags: [],
  bannedTags: [],
  roundCount: 10,
  timePerRound: 20,
  maxPoints: 1000,
  infiniteRounds: false,
  pointsPerAnswer: 100,
  maxPlayers: 8,
}

export interface SuspendedQuestion {
  id: string
  text: string
  answer: string
  acceptedAnswers: string[]
  category: string
  difficulty: string
  hint?: string | null
  imageUrl?: string | null
  tags?: string[]
  reason?: string
  mutedAt?: number
}

export interface AdminUser {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string | null
  isAdmin: boolean
  level: number
  xp: number
  totalPoints: number
  gamesPlayed: number
  gamesWon: number
  createdAt: string
  updatedAt: string
  _count?: {
    templates: number
    achievements: number
    gameHistory: number
  }
}

export interface AdminUsersStats {
  totalUsers: number
  totalAdmins: number
  totalPlayers: number
  totalGamesPlayed: number
  totalGamesWon: number
  totalXp: number
  totalPoints: number
}
