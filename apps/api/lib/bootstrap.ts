import bcrypt from 'bcryptjs'
import prisma from './prisma'
import { INITIAL_QUESTIONS } from './initialQuestions'

const DEFAULT_CATEGORIES = [
  { slug: 'geographie', name: 'Géographie', icon: '🌍' },
  { slug: 'histoire', name: 'Histoire', icon: '📜' },
  { slug: 'sciences', name: 'Sciences & Nature', icon: '🔬' },
  { slug: 'cinema', name: 'Cinéma & Séries', icon: '🎬' },
  { slug: 'musique', name: 'Musique', icon: '🎵' },
  { slug: 'sport', name: 'Sports', icon: '⚽' },
  { slug: 'litterature', name: 'Littérature', icon: '📚' },
  { slug: 'gastronomie', name: 'Gastronomie', icon: '🍳' },
  { slug: 'warframe', name: 'Warframe', icon: '⚔️' },
  { slug: 'anime & manga', name: 'Anime & Manga', icon: '🎌' },
]

export interface BootstrapSummary {
  connected: boolean
  adminCreatedOrPromoted: boolean
  questionsSeeded: number
  arenaCreated: boolean
  error?: string
}

/**
 * Auto-bootstrap the database on cold start:
 * 1. Checks connectivity
 * 2. Seeds or promotes default Administrator
 * 3. Seeds initial questions if empty
 * 4. Seeds default categories
 * 5. Creates default arena if empty
 * 6. Resets orphaned arena sessions
 */
export async function bootstrapDatabase(): Promise<BootstrapSummary> {
  const summary: BootstrapSummary = {
    connected: false,
    adminCreatedOrPromoted: false,
    questionsSeeded: 0,
    arenaCreated: false,
  }

  try {
    // 1. Connectivity test
    await prisma.$queryRaw`SELECT 1`
    summary.connected = true
    console.log('✅ [Database] Connexion à la base de données établie avec succès.')

    // Ensure database tables exist (if fresh Neon database)
    try {
      await prisma.arena.count()
    } catch {
      console.log('📦 [Bootstrap] Tables absentes dans Neon. Synchronisation automatique (prisma db push)...')
      try {
        const { execSync } = await import('child_process')
        const path = await import('path')
        const fs = await import('fs')
        const dbPath = path.resolve(process.cwd(), '../../packages/database')
        const altPath = path.resolve(process.cwd(), 'packages/database')
        const targetDir = fs.existsSync(dbPath) ? dbPath : altPath
        execSync('bun x prisma db push --accept-data-loss', {
          cwd: targetDir,
          stdio: 'inherit',
          env: process.env,
        })
        console.log('✅ [Bootstrap] Tables créées dans Neon avec succès.')
      } catch (e) {
        console.warn('⚠️ [Bootstrap] Échec du db push automatique :', e)
      }
    }

    // 2. Reset orphaned arenas
    await prisma.arena
      .updateMany({
        data: { players: 0, status: 'waiting' },
      })
      .catch(() => {})

    // 3. Ensure Default Administrator
    const existingAdmin = await prisma.user.findFirst({
      where: { isAdmin: true },
    })

    if (!existingAdmin) {
      const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim()
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'
      const passwordHash = await bcrypt.hash(adminPassword, 10)

      const userWithUsername = await prisma.user.findFirst({
        where: { username: { equals: adminUsername, mode: 'insensitive' } },
      })

      if (userWithUsername) {
        await prisma.user.update({
          where: { id: userWithUsername.id },
          data: { isAdmin: true },
        })
        console.log(`👑 [Bootstrap] Utilisateur existant '${adminUsername}' promu Administrateur.`)
      } else {
        await prisma.user.create({
          data: {
            username: adminUsername,
            displayName: 'Administrateur',
            passwordHash,
            isAdmin: true,
            level: 10,
            xp: 1000,
          },
        })
        console.log(`👑 [Bootstrap] Compte Administrateur par défaut créé : '${adminUsername}'.`)
      }
      summary.adminCreatedOrPromoted = true
    }

    // 4. Ensure Categories
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = await prisma.category.findUnique({ where: { slug: cat.slug } })
      if (!exists) {
        await prisma.category.create({ data: cat }).catch(() => {})
      }
    }

    // 5. Ensure Initial Questions
    const questionCount = await prisma.question.count()
    if (questionCount === 0) {
      console.log(`📚 [Bootstrap] Base de questions vide. Insertion de ${INITIAL_QUESTIONS.length} questions initiales...`)
      const res = await prisma.question.createMany({
        data: INITIAL_QUESTIONS,
      })
      summary.questionsSeeded = res.count
      console.log(`✅ [Bootstrap] ${res.count} questions initiales insérées.`)
    }

    // 6. Ensure Default Arena
    const arenaCount = await prisma.arena.count()
    if (arenaCount === 0) {
      await prisma.arena.create({
        data: {
          name: 'Arène Principale',
          players: 0,
          maxPlayers: 20,
          status: 'waiting',
          gameMode: 'flashguess',
          difficulty: 'facile',
          categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique'],
        },
      })
      summary.arenaCreated = true
      console.log('🏟️ [Bootstrap] Arène principale par défaut créée.')
    }

    return summary
  } catch (err) {
    const errorMsg = String(err)
    summary.error = errorMsg
    console.warn(`⚠️ [Bootstrap] Impossible d'initialiser la base au démarrage : ${errorMsg}`)
    return summary
  }
}
