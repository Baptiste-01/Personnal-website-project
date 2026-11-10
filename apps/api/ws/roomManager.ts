import prisma from '../lib/prisma'
import { buildWhereClause, shuffle } from '../routes/questions'

export interface PlayerSummary {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  isOnline: boolean
  score: number
  streak: number
  bestStreak: number
  hasAnswered: boolean
  answeredCorrectly: boolean
  answerTime: number | null
}

export interface PlayerSession {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  isOnline: boolean
  score: number
  streak: number
  bestStreak: number
  roundScores: number[]
  reactionTimes: number[]
  hasAnswered: boolean
  answeredCorrectly: boolean
  answerTime: number | null
  ws: any
  joinedAt: number
  disconnectTimeout?: any
}

export interface GameSettings {
  categories: string[]
  difficulty: string
  roundCount: number
  timePerRound: number
  maxPoints: number
  infiniteRounds: boolean
  pointsPerAnswer: number
  maxPlayers: number
  catDiffs?: string
  catTags?: string
  bannedCatTags?: string
  tags?: string | string[]
  bannedTags?: string | string[]
  categoryDifficulties?: Record<string, string[]>
  categoryTags?: Record<string, string[]>
  bannedCategoryTags?: Record<string, string[]>
}

function serializeCategoryMap(
  map?: Record<string, string[]>,
  activeCategories?: string[]
): string | undefined {
  if (!map || typeof map !== 'object') return undefined
  const activeSet =
    activeCategories && activeCategories.length > 0
      ? new Set(activeCategories.map(c => c.toLowerCase().trim()))
      : null
  const encoded = Object.entries(map)
    .filter(([cat, vals]) => {
      if (!Array.isArray(vals) || vals.length === 0) return false
      return !activeSet || activeSet.has(cat.toLowerCase().trim())
    })
    .map(([cat, vals]) => `${cat}:${vals.join('+')}`)
    .join(',')
  return encoded || undefined
}

export interface QuestionData {
  id: string
  text: string
  answer: string
  acceptedAnswers: string[]
  hint: string | null
  imageUrl: string | null
  category: string
  difficulty: string
  tags: string[]
}

export const FALLBACK_QUESTIONS: QuestionData[] = [
  {
    id: 'fb-1',
    text: 'Quelle est la capitale de la France ?',
    answer: 'Paris',
    acceptedAnswers: ['paris'],
    hint: 'La Ville Lumière',
    imageUrl: null,
    category: 'geographie',
    difficulty: 'facile',
    tags: ['europe', 'capitale'],
  },
  {
    id: 'fb-2',
    text: 'Quel monument emblématique en fer puddlé a été érigé pour l\'Exposition universelle de 1889 ?',
    answer: 'Tour Eiffel',
    acceptedAnswers: ['la tour eiffel', 'tour eiffel', 'eiffel'],
    hint: 'Situé sur le Champ-de-Mars à Paris',
    imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600&auto=format&fit=crop',
    category: 'histoire',
    difficulty: 'facile',
    tags: ['monument', 'france'],
  },
  {
    id: 'fb-3',
    text: 'Quelle est la capitale du Japon ?',
    answer: 'Tokyo',
    acceptedAnswers: ['tokyo', 'tokio'],
    hint: 'La plus grande métropole du monde',
    imageUrl: null,
    category: 'capitale',
    difficulty: 'facile',
    tags: ['asie', 'japon'],
  },
  {
    id: 'fb-4',
    text: 'Qui a peint La Joconde (Mona Lisa) ?',
    answer: 'Leonard de Vinci',
    acceptedAnswers: ['leonard de vinci', 'de vinci', 'vinci', 'da vinci', 'leonardo da vinci'],
    hint: 'Génie italien de la Renaissance',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa_%28Leonardo_da_Vinci%29.jpg/300px-Mona_Lisa_%28Leonardo_da_Vinci%29.jpg',
    category: 'histoire',
    difficulty: 'facile',
    tags: ['art', 'peinture'],
  },
  {
    id: 'fb-5',
    text: 'Quel est le symbole chimique de l\'eau ?',
    answer: 'H2O',
    acceptedAnswers: ['h2o'],
    hint: 'Deux atomes d\'hydrogène et un d\'oxygène',
    imageUrl: null,
    category: 'sciences',
    difficulty: 'facile',
    tags: ['chimie'],
  },
  {
    id: 'fb-6',
    text: 'Quelle est la planète la plus proche du Soleil ?',
    answer: 'Mercure',
    acceptedAnswers: ['mercure', 'mercury'],
    hint: 'Première planète du Système solaire',
    imageUrl: null,
    category: 'sciences',
    difficulty: 'moyen',
    tags: ['espace', 'astronomie'],
  },
  {
    id: 'fb-7',
    text: 'Quelle est la capitale de l\'Australie ?',
    answer: 'Canberra',
    acceptedAnswers: ['canberra'],
    hint: 'Ce n\'est ni Sydney ni Melbourne',
    imageUrl: null,
    category: 'capitale',
    difficulty: 'moyen',
    tags: ['oceanie'],
  },
  {
    id: 'fb-8',
    text: 'Quel est le plus vaste océan de la Terre ?',
    answer: 'Pacifique',
    acceptedAnswers: ['pacifique', 'ocean pacifique', 'l\'ocean pacifique'],
    hint: 'Couvre environ un tiers de la surface terrestre',
    imageUrl: null,
    category: 'geographie',
    difficulty: 'facile',
    tags: ['nature'],
  },
  {
    id: 'fb-9',
    text: 'Dans la mythologie grecque, qui est le roi des dieux et maître de la foudre ?',
    answer: 'Zeus',
    acceptedAnswers: ['zeus'],
    hint: 'Réside au sommet du mont Olympe',
    imageUrl: null,
    category: 'mythologie',
    difficulty: 'facile',
    tags: ['grece'],
  },
  {
    id: 'fb-10',
    text: 'En quelle année a eu lieu la prise de la Bastille en France ?',
    answer: '1789',
    acceptedAnswers: ['1789', 'l\'an 1789'],
    hint: 'Début de la Révolution française',
    imageUrl: null,
    category: 'histoire',
    difficulty: 'facile',
    tags: ['france', 'revolution'],
  },
  {
    id: 'fb-11',
    text: 'Quelle est la capitale du Canada ?',
    answer: 'Ottawa',
    acceptedAnswers: ['ottawa'],
    hint: 'Située dans la province de l\'Ontario',
    imageUrl: null,
    category: 'capitale',
    difficulty: 'moyen',
    tags: ['amerique'],
  },
  {
    id: 'fb-12',
    text: 'Combien de cœurs possède une pieuvre ?',
    answer: '3',
    acceptedAnswers: ['trois', '3'],
    hint: 'Plus de 2',
    imageUrl: null,
    category: 'sciences',
    difficulty: 'moyen',
    tags: ['animaux'],
  },
]

export function normalizeAnswer(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export class GameRoom {
  public id: string
  public name: string
  public status: 'waiting' | 'starting' | 'playing' | 'reveal' | 'finished' = 'waiting'
  public players = new Map<string, PlayerSession>()
  public hostId: string | null = null
  public currentRoundIndex = 0
  public timeLeft = 20
  public roundStartTime = 0
  public questions: QuestionData[] = []
  public timer: any = null
  public revealTimeout: any = null
  public lastActiveAt = Date.now()

  public settings: GameSettings = {
    categories: ['mythologie', 'capitale', 'geographie', 'histoire', 'sciences'],
    difficulty: 'facile',
    roundCount: 10,
    timePerRound: 20,
    maxPoints: 1000,
    infiniteRounds: false,
    pointsPerAnswer: 100,
    maxPlayers: 8,
  }

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  public getPlayerSummaries(): PlayerSummary[] {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
      isOnline: p.isOnline,
      score: p.score,
      streak: p.streak,
      bestStreak: p.bestStreak,
      hasAnswered: p.hasAnswered,
      answeredCorrectly: p.answeredCorrectly,
      answerTime: p.answerTime,
    }))
  }

  public getActivePlayerCount(): number {
    return Array.from(this.players.values()).filter(p => p.isOnline).length
  }

  public getLeaderboard() {
    return this.getPlayerSummaries().sort((a, b) => b.score - a.score)
  }

  public getCurrentQuestion(): QuestionData | null {
    if (this.questions.length === 0) return null
    return this.questions[this.currentRoundIndex % this.questions.length] ?? null
  }

  public broadcast(message: Record<string, unknown>, excludePlayerId?: string) {
    this.lastActiveAt = Date.now()
    const payload = JSON.stringify(message)
    for (const [id, player] of this.players.entries()) {
      if (excludePlayerId && id === excludePlayerId) continue
      try {
        if (player.ws && typeof player.ws.send === 'function') {
          player.ws.send(payload)
        }
      } catch {
        // Socket send failed
      }
    }
  }

  public sendTo(playerId: string, message: Record<string, unknown>) {
    const player = this.players.get(playerId)
    if (!player || !player.ws) return
    try {
      player.ws.send(JSON.stringify(message))
    } catch {
      // Socket send failed
    }
  }

  public addOrUpdatePlayer(id: string, name: string, ws: any): PlayerSession {
    this.lastActiveAt = Date.now()
    const existing = this.players.get(id)
    if (existing) {
      if (existing.disconnectTimeout) {
        clearTimeout(existing.disconnectTimeout)
        existing.disconnectTimeout = null
      }
      existing.name = name || existing.name
      existing.ws = ws
      existing.isOnline = true
      return existing
    }

    const isHost = this.players.size === 0 || !this.hostId
    if (isHost) {
      this.hostId = id
    }

    const newPlayer: PlayerSession = {
      id,
      name: name || `Joueur ${this.players.size + 1}`,
      isHost,
      isReady: isHost,
      isOnline: true,
      score: 0,
      streak: 0,
      bestStreak: 0,
      roundScores: [],
      reactionTimes: [],
      hasAnswered: false,
      answeredCorrectly: false,
      answerTime: null,
      ws,
      joinedAt: Date.now(),
    }

    this.players.set(id, newPlayer)
    return newPlayer
  }

  public handlePlayerDisconnect(id: string) {
    const player = this.players.get(id)
    if (!player) return

    player.isOnline = false
    player.ws = null

    if (player.disconnectTimeout) {
      clearTimeout(player.disconnectTimeout)
    }

    // 45s grace period: keep session alive across route transitions and refreshes
    player.disconnectTimeout = setTimeout(() => {
      if (!player.isOnline) {
        this.removePlayer(id)
      }
    }, 45000)

    this.broadcast({
      type: 'player_status_change',
      playerId: id,
      isOnline: false,
      players: this.getPlayerSummaries(),
    })
  }

  public removePlayer(id: string) {
    const player = this.players.get(id)
    if (!player) return

    if (player.disconnectTimeout) {
      clearTimeout(player.disconnectTimeout)
      player.disconnectTimeout = null
    }

    this.players.delete(id)

    // Reassign host if host left
    if (player.isHost && this.players.size > 0) {
      const nextHost = this.players.values().next().value
      if (nextHost) {
        nextHost.isHost = true
        this.hostId = nextHost.id
      }
    } else if (this.players.size === 0) {
      this.hostId = null
      this.status = 'waiting'
      this.clearAllTimers()
    }

    this.broadcast({
      type: 'player_left',
      playerId: id,
      newHostId: this.hostId,
      players: this.getPlayerSummaries(),
    })

    // Sync active player count and status to DB
    const activeCount = this.getActivePlayerCount()
    prisma.arena
      .update({
        where: { id: this.id },
        data: {
          players: activeCount,
          ...(activeCount === 0 ? { status: 'waiting' } : {}),
        },
      })
      .catch(() => {})
  }

  public clearAllTimers() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.revealTimeout) {
      clearTimeout(this.revealTimeout)
      this.revealTimeout = null
    }
  }

  public updateSettings(partial: Partial<GameSettings>) {
    this.settings = {
      ...this.settings,
      ...partial,
    }
    this.broadcast({
      type: 'settings_updated',
      settings: this.settings,
    })
  }

  public async startGame(): Promise<boolean> {
    this.clearAllTimers()
    this.currentRoundIndex = 0

    // Reset player scores
    for (const player of this.players.values()) {
      player.score = 0
      player.streak = 0
      player.bestStreak = 0
      player.roundScores = []
      player.reactionTimes = []
      player.hasAnswered = false
      player.answeredCorrectly = false
      player.answerTime = null
    }

    const catDiffs = this.settings.categoryDifficulties
      ? serializeCategoryMap(this.settings.categoryDifficulties, this.settings.categories)
      : this.settings.catDiffs
    const catTags = this.settings.categoryTags
      ? serializeCategoryMap(this.settings.categoryTags, this.settings.categories)
      : this.settings.catTags
    const bannedCatTags = this.settings.bannedCategoryTags
      ? serializeCategoryMap(this.settings.bannedCategoryTags, this.settings.categories)
      : this.settings.bannedCatTags
    const tagsStr = Array.isArray(this.settings.tags)
      ? this.settings.tags.join(',')
      : this.settings.tags
    const bannedTagsStr = Array.isArray(this.settings.bannedTags)
      ? this.settings.bannedTags.join(',')
      : this.settings.bannedTags

    const hasStrictFilters = Boolean(
      catTags || bannedCatTags || tagsStr || bannedTagsStr || this.settings.categories.length > 0
    )

    // Load questions from DB matching category filters & tag bans
    let loadedQuestions: QuestionData[] = []
    let dbFilteredZero = false
    try {
      const where = buildWhereClause({
        categories: this.settings.categories.join(','),
        difficulty: this.settings.difficulty,
        catDiffs,
        catTags,
        bannedCatTags,
        tags: tagsStr,
        bannedTags: bannedTagsStr,
      })

      let dbQuestions = await prisma.question.findMany({ where })
      if (dbQuestions.length === 0) {
        if (hasStrictFilters) {
          const totalInDb = await prisma.question.count()
          if (totalInDb > 0) {
            dbFilteredZero = true
          }
        } else {
          dbQuestions = await prisma.question.findMany({ take: 50 })
        }
      }

      if (dbQuestions.length > 0) {
        loadedQuestions = dbQuestions.map(q => ({
          id: q.id,
          text: q.text,
          answer: q.answer,
          acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [q.answer],
          hint: q.hint,
          imageUrl: q.imageUrl,
          category: q.category,
          difficulty: q.difficulty,
          tags: Array.isArray(q.tags) ? q.tags : [],
        }))
      }
    } catch {
      loadedQuestions = []
    }

    if (dbFilteredZero) {
      this.broadcast({
        type: 'room_error',
        message: 'Aucune question ne correspond aux filtres et tags bannis actuels.',
      })
      return false
    }

    // Fallback: guaranteed question list if database returned empty (no DB records)
    if (loadedQuestions.length === 0) {
      loadedQuestions = [...FALLBACK_QUESTIONS]
    }

    this.questions = shuffle(loadedQuestions)
    this.status = 'playing'

    // Notify clients that game has started (triggers navigation to /play/:arenaId)
    this.broadcast({
      type: 'game_started',
      arenaId: this.id,
    })

    return true

    // Start round 0 after a short transition buffer (500ms)
    setTimeout(() => {
      if (this.status === 'playing') {
        this.startRound(0)
      }
    }, 500)
  }

  public startRound(roundIndex: number) {
    this.clearAllTimers()
    this.status = 'playing'
    this.currentRoundIndex = roundIndex
    this.timeLeft = this.settings.timePerRound
    this.roundStartTime = Date.now()

    // Reset round states
    for (const player of this.players.values()) {
      player.hasAnswered = false
      player.answeredCorrectly = false
      player.answerTime = null
    }

    const q = this.getCurrentQuestion()
    if (!q) {
      this.finishGame()
      return
    }

    // Broadcast round info (ANTI-CHEAT: NO answers sent!)
    this.broadcast({
      type: 'new_round',
      round: roundIndex,
      totalRounds: this.settings.infiniteRounds ? 0 : this.settings.roundCount,
      isInfinite: this.settings.infiniteRounds,
      timePerRound: this.settings.timePerRound,
      question: {
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl,
      },
      players: this.getPlayerSummaries(),
    })

    // Server-authoritative timer
    this.timer = setInterval(() => {
      this.timeLeft -= 1
      this.broadcast({
        type: 'tick',
        timeLeft: this.timeLeft,
      })

      if (this.timeLeft <= 0) {
        this.endRound()
      }
    }, 1000)
  }

  public submitAnswer(playerId: string, rawAnswer: string) {
    if (this.status !== 'playing') return

    const player = this.players.get(playerId)
    if (!player || player.answeredCorrectly) return

    const q = this.getCurrentQuestion()
    if (!q) return

    const normalized = normalizeAnswer(rawAnswer)
    const isCorrect =
      normalizeAnswer(q.answer) === normalized ||
      q.acceptedAnswers.some(a => normalizeAnswer(a) === normalized)

    if (isCorrect) {
      player.answeredCorrectly = true
      player.hasAnswered = true

      const timeTaken = Math.max(0.5, (Date.now() - this.roundStartTime) / 1000)
      player.answerTime = timeTaken
      player.reactionTimes.push(timeTaken)

      const nextStreak = player.streak + 1
      player.streak = nextStreak
      player.bestStreak = Math.max(player.bestStreak, nextStreak)

      const speedRatio = Math.max(0, this.timeLeft / this.settings.timePerRound)
      const speedBonus = Math.round(speedRatio * (this.settings.pointsPerAnswer * 0.5))
      const streakMultiplier = nextStreak >= 5 ? 2.0 : nextStreak >= 3 ? 1.5 : 1.0
      const roundPts = Math.round((this.settings.pointsPerAnswer + speedBonus) * streakMultiplier)

      player.score += roundPts
      player.roundScores.push(roundPts)

      // Send private confirmation to answerer
      this.sendTo(playerId, {
        type: 'answer_result',
        isCorrect: true,
        points: roundPts,
        score: player.score,
        streak: player.streak,
      })

      // Broadcast public live update to everyone
      this.broadcast({
        type: 'player_answered',
        playerId: player.id,
        playerName: player.name,
        isCorrect: true,
        score: player.score,
        streak: player.streak,
        answerTime: timeTaken,
      })

      // Check win condition (score cap reached)
      if (player.score >= this.settings.maxPoints) {
        this.endRound()
        return
      }

      // If all active online players answered correctly, end round immediately!
      const activeOnlinePlayers = Array.from(this.players.values()).filter(p => p.isOnline)
      const allFound = activeOnlinePlayers.length > 0 && activeOnlinePlayers.every(p => p.answeredCorrectly)
      if (allFound) {
        this.endRound()
      }
    } else {
      // Wrong answer
      this.sendTo(playerId, {
        type: 'answer_result',
        isCorrect: false,
      })
    }
  }

  public endRound() {
    this.clearAllTimers()
    this.status = 'reveal'

    // Penalty / streak reset for players who did not answer
    for (const player of this.players.values()) {
      if (!player.answeredCorrectly) {
        player.streak = 0
        player.roundScores.push(0)
        player.reactionTimes.push(this.settings.timePerRound)
      }
    }

    const q = this.getCurrentQuestion()
    const anyWon = Array.from(this.players.values()).some(p => p.score >= this.settings.maxPoints)
    const allRoundsPlayed =
      !this.settings.infiniteRounds &&
      this.currentRoundIndex + 1 >= this.settings.roundCount

    const isGameOver = anyWon || allRoundsPlayed

    // Reveal correct answer to everyone
    this.broadcast({
      type: 'round_end',
      answer: q ? q.answer : '',
      acceptedAnswers: q ? q.acceptedAnswers : [],
      players: this.getPlayerSummaries(),
      isGameOver,
    })

    if (isGameOver) {
      this.finishGame()
    } else {
      // 3.5 seconds reveal before next round starts
      this.revealTimeout = setTimeout(() => {
        this.startRound(this.currentRoundIndex + 1)
      }, 3500)
    }
  }

  public finishGame() {
    this.clearAllTimers()
    this.status = 'finished'

    const leaderboard = this.getLeaderboard()
    this.broadcast({
      type: 'game_over',
      leaderboard,
      podium: leaderboard.slice(0, 3),
      winner: leaderboard[0] ?? null,
    })
  }

  public resetToLobby() {
    this.clearAllTimers()
    this.status = 'waiting'
    this.currentRoundIndex = 0

    for (const p of this.players.values()) {
      p.score = 0
      p.streak = 0
      p.bestStreak = 0
      p.roundScores = []
      p.reactionTimes = []
      p.hasAnswered = false
      p.answeredCorrectly = false
      p.answerTime = null
      p.isReady = p.isHost
    }

    this.broadcast({
      type: 'game_restarted',
      room: this.getState(),
    })
  }

  public getState() {
    const q = this.getCurrentQuestion()
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      hostId: this.hostId,
      settings: this.settings,
      players: this.getPlayerSummaries(),
      currentRound: this.currentRoundIndex,
      totalRounds: this.settings.infiniteRounds ? 0 : this.settings.roundCount,
      isInfinite: this.settings.infiniteRounds,
      timeLeft: this.timeLeft,
      revealedAnswer:
        this.status === 'reveal' || this.status === 'finished' ? q?.answer : null,
      question:
        (this.status === 'playing' || this.status === 'reveal') && q
          ? {
              id: q.id,
              text: q.text,
              imageUrl: q.imageUrl,
            }
          : null,
    }
  }
}

class RoomManager {
  private rooms = new Map<string, GameRoom>()

  public getOrCreate(id: string, name = 'Arène'): GameRoom {
    let room = this.rooms.get(id)
    if (!room) {
      room = new GameRoom(id, name)
      this.rooms.set(id, room)
    }
    return room
  }

  public get(id: string): GameRoom | undefined {
    return this.rooms.get(id)
  }

  public delete(id: string): boolean {
    const room = this.rooms.get(id)
    if (room) {
      room.clearAllTimers()
      return this.rooms.delete(id)
    }
    return false
  }

  public getLivePlayerCount(id: string): number {
    const room = this.rooms.get(id)
    return room ? room.getActivePlayerCount() : 0
  }

  public removeRoomIfEmpty(id: string) {
    const room = this.rooms.get(id)
    // Only remove if completely empty and no activity for 3 minutes
    if (room && room.getActivePlayerCount() === 0 && Date.now() - room.lastActiveAt > 180000) {
      room.clearAllTimers()
      this.rooms.delete(id)
    }
  }

  public cleanupInactiveRooms() {
    const now = Date.now()
    for (const [id, room] of this.rooms.entries()) {
      if (room.getActivePlayerCount() === 0 && now - room.lastActiveAt > 180000) {
        room.clearAllTimers()
        this.rooms.delete(id)
      }
    }
  }
}

export const roomManager = new RoomManager()

// Periodic housekeeping for stale rooms (every 60s)
setInterval(() => {
  roomManager.cleanupInactiveRooms()
}, 60000)
