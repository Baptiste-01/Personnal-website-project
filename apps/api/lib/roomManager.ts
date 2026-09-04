export interface RoomPlayer {
  id: string
  socketId: string
  name: string
  isHost: boolean
  isReady: boolean
  score: number
  streak: number
  hasAnsweredCurrentRound: boolean
  avatarUrl?: string
}

export interface RoomSettings {
  categories: string[]
  difficulty: string
  categoryDifficulties: Record<string, string[]>
  roundCount: number
  timePerRound: number
  maxPoints: number
  infiniteRounds: boolean
  pointsPerAnswer: number
}

export interface QuestionItem {
  id: number | string
  text: string
  answer: string
  acceptedAnswers: string[]
  hint: string
  imageUrl?: string | null
  category: string
  difficulty: string
}

export interface ArenaRoom {
  id: string
  hostId: string | null
  players: Map<string, RoomPlayer> // socketId -> RoomPlayer
  settings: RoomSettings
  phase: 'lobby' | 'playing' | 'reveal' | 'results'
  questions: QuestionItem[]
  currentRound: number
  firstAnswerTimestamp: number | null
  roundStartTime: number | null
}

const DEFAULT_SETTINGS: RoomSettings = {
  categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique', 'sport', 'litterature', 'gastronomie'],
  difficulty: 'facile',
  categoryDifficulties: {
    geographie: ['facile', 'moyen', 'difficile'],
    histoire: ['facile', 'moyen', 'difficile'],
    sciences: ['facile', 'moyen', 'difficile'],
    cinema: ['facile', 'moyen', 'difficile'],
    musique: ['facile', 'moyen', 'difficile'],
    sport: ['facile', 'moyen', 'difficile'],
    litterature: ['facile', 'moyen', 'difficile'],
    gastronomie: ['facile', 'moyen', 'difficile'],
  },
  roundCount: 10,
  timePerRound: 20,
  maxPoints: 1000,
  infiniteRounds: false,
  pointsPerAnswer: 100,
}

class RoomManager {
  private rooms: Map<string, ArenaRoom> = new Map()
  private disconnectTimeouts: Map<string, Timer> = new Map()

  getOrCreateRoom(arenaId: string, initialSettings?: Partial<RoomSettings>): ArenaRoom {
    let room = this.rooms.get(arenaId)
    if (!room) {
      room = {
        id: arenaId,
        hostId: null,
        players: new Map(),
        settings: { ...DEFAULT_SETTINGS, ...initialSettings },
        phase: 'lobby',
        questions: [],
        currentRound: 0,
        firstAnswerTimestamp: null,
        roundStartTime: null,
      }
      this.rooms.set(arenaId, room)
    }
    return room
  }

  getRoom(arenaId: string): ArenaRoom | undefined {
    return this.rooms.get(arenaId)
  }

  addPlayer(arenaId: string, socketId: string, playerInfo: { id: string; name: string; avatarUrl?: string }): RoomPlayer {
    const room = this.getOrCreateRoom(arenaId)

    // Annule tout timeout de déconnexion programmé pour cet utilisateur
    const pendingTimer = this.disconnectTimeouts.get(playerInfo.id)
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      this.disconnectTimeouts.delete(playerInfo.id)
    }

    // Le premier joueur qui rejoint devient l'hôte permanent de la salle
    if (!room.hostId) {
      room.hostId = playerInfo.id
    }

    // Vérifie si le joueur existe déjà dans la salle (reconnexion)
    let existingPlayer: RoomPlayer | undefined
    for (const [sId, p] of room.players.entries()) {
      if (p.id === playerInfo.id || sId === socketId) {
        existingPlayer = p
        room.players.delete(sId)
        break
      }
    }

    const isHost = playerInfo.id === room.hostId

    const player: RoomPlayer = {
      id: playerInfo.id,
      socketId,
      name: playerInfo.name || existingPlayer?.name || 'Joueur Anonyme',
      avatarUrl: playerInfo.avatarUrl ?? existingPlayer?.avatarUrl,
      isHost,
      isReady: isHost ? true : (existingPlayer ? existingPlayer.isReady : false),
      score: existingPlayer ? existingPlayer.score : 0,
      streak: existingPlayer ? existingPlayer.streak : 0,
      hasAnsweredCurrentRound: existingPlayer ? existingPlayer.hasAnsweredCurrentRound : false,
    }

    room.players.set(socketId, player)
    return player
  }

  deleteRoom(arenaId: string): ArenaRoom | undefined {
    const room = this.rooms.get(arenaId)
    if (room) {
      this.rooms.delete(arenaId)
    }
    return room
  }

  removePlayer(socketId: string): { room?: ArenaRoom; removedPlayer?: RoomPlayer; isRoomEmpty?: boolean } {
    for (const [arenaId, room] of this.rooms.entries()) {
      const player = room.players.get(socketId)
      if (player) {
        room.players.delete(socketId)
        const isRoomEmpty = room.players.size === 0
        return { room, removedPlayer: player, isRoomEmpty }
      }
    }
    return {}
  }

  getPlayer(socketId: string): { room: ArenaRoom; player: RoomPlayer } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.get(socketId)
      if (player) {
        return { room, player }
      }
    }
    return null
  }

  toggleReady(socketId: string): { room: ArenaRoom; player: RoomPlayer } | null {
    const found = this.getPlayer(socketId)
    if (found) {
      found.player.isReady = !found.player.isReady
      return found
    }
    return null
  }

  updateSettings(arenaId: string, socketId: string, newSettings: Partial<RoomSettings>): ArenaRoom | null {
    const room = this.rooms.get(arenaId)
    if (!room) return null

    const player = room.players.get(socketId)
    if (!player || !player.isHost) return null

    room.settings = { ...room.settings, ...newSettings }
    return room
  }

  getPlayersList(room: ArenaRoom): RoomPlayer[] {
    return Array.from(room.players.values())
  }
}

const globalForRoomManager = globalThis as unknown as {
  roomManager: RoomManager | undefined
}

export const roomManager = globalForRoomManager.roomManager ?? new RoomManager()

if (process.env.NODE_ENV !== 'production') {
  globalForRoomManager.roomManager = roomManager
}
