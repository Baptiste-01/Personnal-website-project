import Elysia from 'elysia'
import prisma from '../lib/prisma'

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const questionsRoute = new Elysia({ prefix: '/questions' })
  .get('/', async ({ query }) => {
    const cats = query.categories?.split(',').filter(Boolean) ?? []
    const diff = query.difficulty as string | undefined
    const count = Number(query.count ?? '10')

    const questions = await prisma.question.findMany({
      where: {
        ...(cats.length > 0 ? { category: { in: cats } } : {}),
        ...(diff ? { difficulty: diff } : {}),
      },
    })

    return shuffle(questions).slice(0, count)
  })
  .get('/categories', async () => {
    const cats = await prisma.question.findMany({
      select: { category: true },
      distinct: ['category'],
    })
    return cats.map(c => c.category)
  })
  .get('/count', async ({ query }) => {
    const cats = query.categories?.split(',').filter(Boolean) ?? []
    const diff = query.difficulty as string | undefined

    const count = await prisma.question.count({
      where: {
        ...(cats.length > 0 ? { category: { in: cats } } : {}),
        ...(diff ? { difficulty: diff } : {}),
      },
    })
    return { count }
  })
