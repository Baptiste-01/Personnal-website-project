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

const DIFFICULTY_MAP: Record<string, string> = {
  easy: 'facile',
  facile: 'facile',
  normal: 'moyen',
  medium: 'moyen',
  moyen: 'moyen',
  hard: 'difficile',
  difficile: 'difficile',
}

function normalizeDifficulty(d: string | undefined): string | undefined {
  if (!d) return undefined
  const lower = d.toLowerCase().trim()
  return DIFFICULTY_MAP[lower] ?? lower
}

function buildWhereClause(query: Record<string, string | undefined>) {
  const catDiffsStr = query.catDiffs
  if (catDiffsStr) {
    // Format: "geographie:facile+moyen,histoire:difficile" or "geographie:easy+normal,histoire:hard"
    const pairs = catDiffsStr.split(',').filter(Boolean).map(p => {
      const parts = p.split(':')
      const cat = parts[0]
      const rawDiffs = (parts[1] ?? '').split('+').filter(Boolean)
      const normDiffs = rawDiffs
        .map(d => normalizeDifficulty(d))
        .filter((d): d is string => Boolean(d) && d !== 'mixte')

      return { category: cat, difficulties: normDiffs }
    })
    if (pairs.length > 0) {
      return {
        OR: pairs.map(p => (
          p.difficulties.length === 0 || p.difficulties.length >= 3
            ? { category: p.category }
            : { category: p.category, difficulty: { in: p.difficulties } }
        )),
      }
    }
  }

  const cats = query.categories?.split(',').filter(Boolean) ?? []
  const rawDiffs = (query.difficulty ?? '').split(',').filter(Boolean)
  const normDiffs = rawDiffs
    .map(d => normalizeDifficulty(d))
    .filter((d): d is string => Boolean(d) && d !== 'mixte')

  return {
    ...(cats.length > 0 ? { category: { in: cats } } : {}),
    ...(normDiffs.length > 0 && normDiffs.length < 3 ? { difficulty: { in: normDiffs } } : {}),
  }
}

export const questionsRoute = new Elysia({ prefix: '/questions' })
  .get('/', async ({ query }) => {
    const count = Number(query.count ?? '10')
    const where = buildWhereClause(query as Record<string, string | undefined>)

    const questions = await prisma.question.findMany({ where })

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
    const where = buildWhereClause(query as Record<string, string | undefined>)

    const count = await prisma.question.count({ where })
    return { count }
  })
