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

/* ─── App ────────────────────────────────────────────────────── */
const app = new Elysia()
  .use(cors())

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

  .listen(3000)

console.log(`✅ Smik Party API running at ${app.server?.hostname}:${app.server?.port}`)
console.log(`   → DB: postgresql (Prisma)`)
console.log(`   → Import Excel: POST http://localhost:3000/admin/import`)
console.log(`   → Template:     GET  http://localhost:3000/admin/template`)
console.log(`   → Stats:        GET  http://localhost:3000/admin/stats`)