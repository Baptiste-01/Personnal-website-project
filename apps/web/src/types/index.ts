/* ─── Smik Party - Shared Types ─── */

export type Difficulty = 'facile' | 'moyen' | 'difficile'

export type Category =
  | 'geographie'
  | 'histoire'
  | 'sciences'
  | 'cinema'
  | 'musique'
  | 'sport'
  | 'litterature'
  | 'gastronomie'

export const CATEGORY_LABELS: Record<Category, string> = {
  geographie: 'Geographie',
  histoire: 'Histoire',
  sciences: 'Sciences',
  cinema: 'Cinema',
  musique: 'Musique',
  sport: 'Sport',
  litterature: 'Litterature',
  gastronomie: 'Gastronomie',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facile: 'Facile',
  moyen: 'Moyen',
  difficile: 'Difficile',
}

export interface Question {
  id: number
  text: string
  answer: string
  acceptedAnswers: string[]
  hint: string
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
  categories: Category[]
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique'],
  difficulty: 'facile',
  roundCount: 10,
  timePerRound: 20,
  maxPoints: 1000,
  infiniteRounds: false,
  pointsPerAnswer: 100,
}
