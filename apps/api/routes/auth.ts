import Elysia from 'elysia'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'

/* ─── Helpers ─── */
const SALT_ROUNDS = 10
const SESSION_TTL_DAYS = 30

function sessionExpiresAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + SESSION_TTL_DAYS)
  return d
}

function generateToken(): string {
  // 48 bytes aléatoires → 96 chars hex
  const arr = new Uint8Array(48)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Valide le format d'un pseudo : 3-20 chars, lettres/chiffres/tirets/underscores */
function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username)
}

/* ─── Route ─── */
export const authRoute = new Elysia({ prefix: '/auth' })

  /* ── Inscription ──────────────────────────────── */
  .post('/register', async ({ body, set }) => {
    const { username, password } = body as { username?: string; password?: string }

    // Validation champs
    if (!username || !password) {
      set.status = 400
      return { error: 'Pseudo et mot de passe requis.' }
    }
    if (!isValidUsername(username)) {
      set.status = 400
      return { error: 'Pseudo invalide. 3-20 caractères, lettres/chiffres/tiret/underscore uniquement.' }
    }
    if (password.length < 6) {
      set.status = 400
      return { error: 'Le mot de passe doit faire au moins 6 caractères.' }
    }

    // Vérification unicité pseudo (insensible à la casse)
    console.log('DEBUG prisma keys:', Object.keys(prisma))
    console.log('DEBUG prisma.user:', !!prisma.user)
    const existing = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    })
    if (existing) {
      set.status = 409
      return { error: 'Ce pseudo est déjà utilisé.' }
    }

    // Création du compte
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        displayName: username,
        passwordHash,
      },
    })

    // Création de la session
    const token = generateToken()
    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt: sessionExpiresAt(),
      },
    })

    set.status = 201
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        level: user.level,
        xp: user.xp,
      },
    }
  })

  /* ── Connexion ────────────────────────────────── */
  .post('/login', async ({ body, set }) => {
    const { username, password } = body as { username?: string; password?: string }

    if (!username || !password) {
      set.status = 400
      return { error: 'Pseudo et mot de passe requis.' }
    }

    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    })

    if (!user) {
      set.status = 401
      return { error: 'Pseudo ou mot de passe incorrect.' }
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      set.status = 401
      return { error: 'Pseudo ou mot de passe incorrect.' }
    }

    // Nouvelle session
    const token = generateToken()
    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt: sessionExpiresAt(),
      },
    })

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isAdmin: user.isAdmin,
        level: user.level,
        xp: user.xp,
        totalPoints: user.totalPoints,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
      },
    }
  })

  /* ── Déconnexion ──────────────────────────────── */
  .post('/logout', async ({ headers, set }) => {
    const token = (headers['authorization'] ?? '').replace('Bearer ', '')
    if (!token) {
      set.status = 400
      return { error: 'Token manquant.' }
    }
    await prisma.session.deleteMany({ where: { token } })
    return { success: true }
  })

  /* ── Moi (profil courant) ─────────────────────── */
  .get('/me', async ({ headers, set }) => {
    const token = (headers['authorization'] ?? '').replace('Bearer ', '')
    if (!token) {
      set.status = 401
      return { error: 'Non authentifié.' }
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            achievements: {
              include: { achievement: true },
              orderBy: { unlockedAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { token } })
      set.status = 401
      return { error: 'Session expirée. Reconnectez-vous.' }
    }

    const { user } = session
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isAdmin: user.isAdmin,
      level: user.level,
      xp: user.xp,
      totalPoints: user.totalPoints,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      recentAchievements: user.achievements.map(ua => ({
        key: ua.achievement.key,
        name: ua.achievement.name,
        icon: ua.achievement.icon,
        unlockedAt: ua.unlockedAt,
      })),
      createdAt: user.createdAt,
    }
  })
