import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { questionsRoute } from './routes/questions'
import { arenasRoute } from './routes/arenas'
import { importRoute } from './routes/import'
import { authRoute } from './routes/auth'
import prisma from './lib/prisma'

/* ─── Graceful shutdown ──────────────────────────────────────── */
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

/* ─── Config ──────────────────────────────────────────────────── */
const PORT = Number(process.env.PORT) || 3000

// Allowed origins: local dev + production Vercel URL
// Add your Vercel URL to ALLOWED_ORIGINS env var (comma-separated) after deploy
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173'
).split(',').map(o => o.trim())

/* ─── App ────────────────────────────────────────────────────── */
const app = new Elysia()
  .use(cors({
    origin: (request) => {
      const origin = request.headers.get('origin') ?? ''
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) return true
      return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.endsWith('.vercel.app'))
    },
    credentials: true,
  }))
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

  /* Routes */
  .use(authRoute)
  .use(questionsRoute)
  .use(arenasRoute)
  .use(importRoute)

  /* Legacy alias /rooms → /arenas */
  .get('/rooms', async () => prisma.arena.findMany({ orderBy: { createdAt: 'asc' } }))
  .get('/rooms/:id', async ({ params, set }) => {
    const arena = await prisma.arena.findUnique({ where: { id: params.id } })
    if (!arena) {
      set.status = 404
      return { error: 'Arène introuvable' }
    }
    return arena
  })

  .listen(PORT)

console.log(`✅ Smik Party API running at ${app.server?.hostname}:${app.server?.port}`)
console.log(`   → DB: postgresql (Prisma)`)
console.log(`   → Allowed origins: ${ALLOWED_ORIGINS.join(', ')} + *.vercel.app`)
console.log(`   → Import Excel: POST /admin/import`)
console.log(`   → Template:     GET  /admin/template`)
console.log(`   → Stats:        GET  /admin/stats`)