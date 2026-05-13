import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Bun charge automatiquement le .env — pas besoin de dotenv
const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://smik_user:smik_password@localhost:5433/smik_db?schema=public'

// Prisma v7: requires a driver adapter
const adapter = new PrismaPg({ connectionString: DATABASE_URL })

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
})

export default prisma
