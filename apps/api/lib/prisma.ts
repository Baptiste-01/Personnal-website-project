import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// DATABASE_URL est injecté via --env-file=.env (racine du projet)
// Voir package.json root : "dev:api"
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('❌ DATABASE_URL manquant — lancez le projet avec "bun run dev" depuis la racine')

// Prisma v7: requires a driver adapter
const adapter = new PrismaPg({ connectionString: DATABASE_URL })

const prisma = new PrismaClient({
  adapter,
  log: ['warn', 'error'],
})

export default prisma
