import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// DATABASE_URL is injected via --env-file=.env (project root)
// See package.json root: "dev:api"
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('❌ DATABASE_URL missing — start the project with "bun run dev" from root')

// Prisma v7: requires a driver adapter
const adapter = new PrismaPg({ connectionString: DATABASE_URL })

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
})

export default prisma
