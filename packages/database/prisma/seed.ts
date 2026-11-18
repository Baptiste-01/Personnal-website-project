import bcrypt from 'bcryptjs'
import prisma from '../../../apps/api/lib/prisma'
import { INITIAL_QUESTIONS } from '../../../apps/api/lib/initialQuestions'

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

async function main() {
  console.log('Seeding Smik Party database...')

  // 1. Categories
  for (const cat of DEFAULT_CATEGORIES) {
    const exists = await prisma.category.findUnique({ where: { slug: cat.slug } })
    if (!exists) {
      await prisma.category.create({ data: cat })
    }
  }
  console.log('Categories verified.')

  // 2. Admin User
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim()
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'
  const passwordHash = await bcrypt.hash(adminPassword, 10)

  const existingAdmin = await prisma.user.findFirst({
    where: { username: { equals: adminUsername, mode: 'insensitive' } },
  })

  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { isAdmin: true },
    })
    console.log(`Updated '${adminUsername}' as Administrator.`)
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
    console.log(`Created default Administrator '${adminUsername}'.`)
  }

  // 3. Clear & re-seed questions
  await prisma.question.deleteMany()
  console.log('Cleared existing questions.')

  const result = await prisma.question.createMany({ data: INITIAL_QUESTIONS })
  console.log(`Inserted ${result.count} questions.`)

  // 4. Default Arena
  await prisma.arena.deleteMany()
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
  console.log('Created default arena.')

  console.log('Seed completed successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
