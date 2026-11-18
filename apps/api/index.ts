import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { questionsRoute } from './routes/questions'
import { arenasRoute } from './routes/arenas'
import { arenaWs } from './routes/arenaWs'
import { importRoute } from './routes/import'
import { authRoute } from './routes/auth'
import { templatesRoute } from './routes/templates'
import { adminUsersRoute } from './routes/adminUsers'
import prisma from './lib/prisma'
import { roomManager } from './ws/roomManager'
import { bootstrapDatabase } from './lib/bootstrap'

// Auto-bootstrap database on server start (admin, questions, arenas, cleanup)
bootstrapDatabase().catch(err => {
  console.warn('⚠️ [Bootstrap Error]:', err)
})

/* ─── Graceful shutdown ──────────────────────────────────────── */
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

/* ─── App ────────────────────────────────────────────────────── */
const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
    })
  )

  /* Health check */
  .get('/', async () => {
    let dbStatus = 'disconnected'
    try {
      await prisma.$queryRaw`SELECT 1`
      dbStatus = 'connected'
    } catch {
      dbStatus = 'disconnected'
    }
    return {
      name: 'Smik Party API',
      status: 'online',
      db: dbStatus,
      serverTime: new Date().toISOString(),
    }
  })
  .get('/health', async () => {
    let dbStatus = 'disconnected'
    try {
      await prisma.$queryRaw`SELECT 1`
      dbStatus = 'connected'
    } catch {
      dbStatus = 'disconnected'
    }
    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      db: dbStatus,
      serverTime: new Date().toISOString(),
    }
  })

  /* Routes */
  .use(authRoute)
  .use(templatesRoute)
  .use(questionsRoute)
  .use(arenasRoute)
  .use(importRoute)
  .use(adminUsersRoute)
  .use(arenaWs)

  /* Legacy alias /rooms → /arenas */
  .get('/rooms', async () => {
    const arenas = await prisma.arena.findMany({ orderBy: { createdAt: 'asc' } })
    return arenas.map(a => {
      const room = roomManager.get(a.id)
      const activePlayers = room ? room.getActivePlayerCount() : (a.players || 0)
      return {
        ...a,
        players: activePlayers,
        status: room ? (activePlayers === 0 ? 'waiting' : room.status) : a.status,
      }
    })
  })
  .get('/rooms/:id', async ({ params, set }) => {
    const arena = await prisma.arena.findUnique({ where: { id: params.id } })
    if (!arena) {
      set.status = 404
      return { error: 'Arène introuvable' }
    }
    const room = roomManager.get(arena.id)
    const activePlayers = room ? room.getActivePlayerCount() : (arena.players || 0)
    return {
      ...arena,
      players: activePlayers,
      status: room ? (activePlayers === 0 ? 'waiting' : room.status) : arena.status,
    }
  })

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
  const hostname = process.env.HOST || '0.0.0.0'

  app.listen({ port, hostname })

  console.log(`✅ Smik Party API running at http://${hostname}:${port}`)
console.log(`   → DB: postgresql (Prisma)`)
console.log(`   → Import Excel: POST http://localhost:3000/admin/import`)
console.log(`   → Template:     GET  http://localhost:3000/admin/template`)
console.log(`   → Stats:        GET  http://localhost:3000/admin/stats`)