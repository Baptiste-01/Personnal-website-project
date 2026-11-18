import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// DATABASE_URL is injected via .env in local dev or cloud environment variables (Neon, Render)
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.warn('⚠️ [Prisma] DATABASE_URL absente dans l\'environnement.')
}

const isRemoteDb =
  Boolean(DATABASE_URL && (
    DATABASE_URL.includes('neon.tech') ||
    DATABASE_URL.includes('supabase') ||
    DATABASE_URL.includes('sslmode=require') ||
    process.env.NODE_ENV === 'production'
  ))

// Prisma v7: requires driver adapter
const adapter = new PrismaPg({
  connectionString: DATABASE_URL || 'postgresql://localhost:5432/smik_party',
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
})

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
})

export default prisma
