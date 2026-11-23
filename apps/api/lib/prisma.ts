import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Automatically find and load .env whether running from root, apps/api, or cloud
dotenv.config()
if (!process.env.DATABASE_URL) {
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
  dotenv.config({ path: path.resolve(currentDir, '../../../.env') })
  if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') })
    dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })
  }
}

// DATABASE_URL is injected via .env in local dev or cloud environment variables (Neon, Render)
const rawDatabaseUrl = process.env.DATABASE_URL
if (!rawDatabaseUrl) {
  console.warn("⚠️ [Prisma] DATABASE_URL absente dans l'environnement.")
}

// Neon appends channel_binding=require which breaks node-pg/Prisma client
let connectionString = rawDatabaseUrl || 'postgresql://localhost:5432/smik_party'
if (connectionString.includes('channel_binding=')) {
  connectionString = connectionString.replace(/[?&]channel_binding=[^&]+/, '').replace(/\?$/, '')
}

const isRemoteDb =
  Boolean(connectionString && (
    connectionString.includes('neon.tech') ||
    connectionString.includes('supabase') ||
    connectionString.includes('sslmode=require') ||
    process.env.NODE_ENV === 'production'
  ))

// Prisma v7: requires driver adapter
const adapter = new PrismaPg({
  connectionString,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
})

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
})

export default prisma
