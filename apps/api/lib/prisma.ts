import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// DATABASE_URL is injected via --env-file=.env in local dev or cloud environment variables (e.g. Neon, Render)
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('❌ DATABASE_URL missing — ensure DATABASE_URL is set in environment')

const isRemoteDb =
  DATABASE_URL.includes('neon.tech') ||
  DATABASE_URL.includes('supabase') ||
  DATABASE_URL.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production'

// Prisma v7: requires a driver adapter
const adapter = new PrismaPg({
  connectionString: DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
})

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
})

export default prisma
