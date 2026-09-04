/* ─── Smik Party - Shared Types ─── */

export type Difficulty = 'facile' | 'moyen' | 'difficile' | 'easy' | 'normal' | 'hard'

export type Category = string

export const DEFAULT_CATEGORIES: string[] = [
  'geographie', 'histoire', 'sciences', 'cinema',
  'musique', 'sport', 'litterature', 'gastronomie',
]

export const ALL_CATEGORIES: string[] = DEFAULT_CATEGORIES

export const CATEGORY_ICONS: Record<string, string> = {
  geographie: '🌍', histoire: '📜', sciences: '🔬', cinema: '🎬',
  musique: '🎵', sport: '⚽', litterature: '📚', gastronomie: '🍽️',
  drapeau: '🚩', drapeaux: '🚩', flags: '🚩', flag: '🚩',
  capitale: '🏛️', capitales: '🏛️', capitals: '🏛️',
  manga: '🎌', mangas: '🎌', anime: '🎌',
  'jeux-video': '🎮', 'jeux video': '🎮', gaming: '🎮', jeux: '🎮',
  nature: '🌿', animaux: '🐾', espace: '🚀',
  art: '🎨', arts: '🎨', technologie: '💻', informatique: '💻', tech: '💻',
  series: '📺', 'séries': '📺', tv: '📺', politique: '🏛️',
}

export const CATEGORY_LABELS: Record<string, string> = {
  geographie: 'Géographie',
  histoire: 'Histoire',
  sciences: 'Sciences',
  cinema: 'Cinéma',
  musique: 'Musique',
  sport: 'Sport',
  litterature: 'Littérature',
  gastronomie: 'Gastronomie',
  drapeau: 'Drapeaux',
  drapeaux: 'Drapeaux',
  capitale: 'Capitales',
  capitales: 'Capitales',
  manga: 'Manga',
  mangas: 'Manga & Anime',
  'jeux-video': 'Jeux Vidéo',
  'jeux video': 'Jeux Vidéo',
  informatique: 'Informatique',
  technologie: 'Technologie',
  animaux: 'Animaux',
  espace: 'Espace',
  art: 'Art & Culture',
}

export function getCategoryLabel(cat: string): string {
  const lower = cat.toLowerCase().trim()
  if (CATEGORY_LABELS[lower]) return CATEGORY_LABELS[lower]
  return cat
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export function getCategoryIcon(cat: string): string {
  const lower = cat.toLowerCase().trim()
  if (CATEGORY_ICONS[lower]) return CATEGORY_ICONS[lower]
  for (const [k, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(k)) return icon
  }
  return '🏷️'
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
  answer: string
  acceptedAnswers: string[]
  hint: string
  imageUrl?: string | null
  category: Category
  difficulty: Difficulty
}

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  hasAnswered: boolean
  streak: number
}

export interface GameSettings {
  categories: Category[]
  difficulty: Difficulty
  difficulties?: Difficulty[]
  categoryDifficulties: Record<string, Difficulty[]>
  roundCount: number
  timePerRound: number
  maxPoints: number
  infiniteRounds: boolean
  pointsPerAnswer: number   // points for the 1st (fastest) correct answer
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
  roundCount?: number
  timePerRound?: number
  maxPoints?: number
  infiniteRounds?: boolean
}

export const ALL_DIFFICULTIES: Difficulty[] = ['facile', 'moyen', 'difficile']

export const DEFAULT_CATEGORY_DIFFICULTIES: Record<string, Difficulty[]> = {
  geographie: ['facile', 'moyen', 'difficile'],
  histoire: ['facile', 'moyen', 'difficile'],
  sciences: ['facile', 'moyen', 'difficile'],
  cinema: ['facile', 'moyen', 'difficile'],
  musique: ['facile', 'moyen', 'difficile'],
  sport: ['facile', 'moyen', 'difficile'],
  litterature: ['facile', 'moyen', 'difficile'],
  gastronomie: ['facile', 'moyen', 'difficile'],
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique'],
  difficulty: 'facile',
  difficulties: ['facile', 'moyen', 'difficile'],
  categoryDifficulties: DEFAULT_CATEGORY_DIFFICULTIES,
  roundCount: 10,
  timePerRound: 20,
  maxPoints: 1000,
  infiniteRounds: false,
  pointsPerAnswer: 100,
}

export interface Achievement {
  id: string
  name: string
  description?: string
  icon?: string
  unlockedAt: string
}

export interface AuthUser {
  id: string
  username: string
  avatarUrl?: string | null
  bio?: string | null
  isAdmin?: boolean
  level: number
  xp: number
  totalPoints: number
  gamesPlayed: number
  gamesWon: number
  createdAt: string
  recentAchievements?: Achievement[]
}

