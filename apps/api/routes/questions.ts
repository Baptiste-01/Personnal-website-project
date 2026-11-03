import Elysia from 'elysia'
import prisma from '../lib/prisma'

/** Fisher-Yates shuffle */
export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export const DIFFICULTY_MAP: Record<string, string> = {
  easy: 'facile',
  facile: 'facile',
  normal: 'moyen',
  medium: 'moyen',
  moyen: 'moyen',
  hard: 'difficile',
  difficile: 'difficile',
}

export function normalizeDifficulty(d: string | undefined): string | undefined {
  if (!d) return undefined
  const lower = d.toLowerCase().trim()
  return DIFFICULTY_MAP[lower] ?? lower
}

export function buildWhereClause(query: Record<string, string | undefined>) {
  const catDiffsStr = query.catDiffs
  const catTagsStr = query.catTags

  // Parse category -> tags map
  const catTagsMap: Record<string, string[]> = {}
  if (catTagsStr) {
    catTagsStr.split(',').filter(Boolean).forEach(entry => {
      const [cat, tagsPart] = entry.split(':')
      if (cat && tagsPart) {
        catTagsMap[cat.toLowerCase().trim()] = tagsPart.split('+').map(t => t.trim()).filter(Boolean)
      }
    })
  }

  // Parse category -> difficulties map
  const catDiffsMap: Record<string, string[]> = {}
  if (catDiffsStr) {
    catDiffsStr.split(',').filter(Boolean).forEach(entry => {
      const [cat, diffsPart] = entry.split(':')
      if (cat && diffsPart) {
        catDiffsMap[cat.toLowerCase().trim()] = diffsPart
          .split('+')
          .map(d => normalizeDifficulty(d))
          .filter((d): d is string => Boolean(d) && d !== 'mixte')
      }
    })
  }

  // Active categories from query.categories or maps
  let activeCategories = query.categories
    ? query.categories.split(',').map(c => c.toLowerCase().trim()).filter(Boolean)
    : Array.from(new Set([...Object.keys(catDiffsMap), ...Object.keys(catTagsMap)]))

  if (activeCategories.length > 0) {
    const orClauses = activeCategories.map(cat => {
      const cond: Record<string, unknown> = {
        category: { equals: cat, mode: 'insensitive' },
      }
      const diffs = catDiffsMap[cat]
      if (diffs && diffs.length > 0 && diffs.length < 3) {
        cond.difficulty = { in: diffs }
      }
      const tags = catTagsMap[cat]
      if (tags && tags.length > 0) {
        cond.tags = { hasSome: tags }
      }
      // If tags is empty/undefined: NO tag restriction (includes all questions of this category)
      return cond
    })

    return { OR: orClauses }
  }

  const globalTags = query.tags?.split(',').map(t => t.trim()).filter(Boolean) ?? []
  const rawDiffs = (query.difficulty ?? '').split(',').filter(Boolean)
  const normDiffs = rawDiffs
    .map(d => normalizeDifficulty(d))
    .filter((d): d is string => Boolean(d) && d !== 'mixte')

  return {
    ...(normDiffs.length > 0 && normDiffs.length < 3 ? { difficulty: { in: normDiffs } } : {}),
    ...(globalTags.length > 0 ? { tags: { hasSome: globalTags } } : {}),
  }
}

const DEFAULT_CATEGORY_META: Record<string, { name: string; icon: string }> = {
  mythologie: { name: 'Mythologie & Légendes', icon: '🏛️' },
  capitale: { name: 'Capitales', icon: '🌍' },
  capitales: { name: 'Capitales', icon: '🌍' },
  drapeau: { name: 'Drapeaux', icon: '🚩' },
  drapeaux: { name: 'Drapeaux', icon: '🚩' },
  geographie: { name: 'Géographie', icon: '🗺️' },
  histoire: { name: 'Histoire', icon: '📜' },
  sciences: { name: 'Sciences', icon: '🔬' },
  cinema: { name: 'Cinéma', icon: '🎬' },
  musique: { name: 'Musique', icon: '🎵' },
  sport: { name: 'Sport', icon: '⚽' },
  litterature: { name: 'Littérature', icon: '📚' },
  gastronomie: { name: 'Gastronomie', icon: '🍽️' },
  warframe: { name: 'Warframe', icon: '⚔️' },
  'anime & manga': { name: 'Anime & Manga', icon: '🎌' },
}

export const questionsRoute = new Elysia({ prefix: '/questions' })
  .get('/', async ({ query }) => {
    const count = Number(query.count ?? '10')
    const where = buildWhereClause(query as Record<string, string | undefined>)

    const questions = await prisma.question.findMany({ where })

    return shuffle(questions).slice(0, count)
  })
  .get('/categories', async () => {
    // 1. Get all questions with their category and tags
    const questions = await prisma.question.findMany({
      select: { category: true, tags: true },
    })

    // 2. Group questions by category
    const catMap: Record<string, { count: number; tagCounts: Record<string, number> }> = {}
    for (const q of questions) {
      const catKey = q.category.toLowerCase().trim()
      if (!catMap[catKey]) {
        catMap[catKey] = { count: 0, tagCounts: {} }
      }
      catMap[catKey].count++
      if (Array.isArray(q.tags)) {
        for (const t of q.tags) {
          const trimmed = t.trim()
          if (trimmed) {
            catMap[catKey].tagCounts[trimmed] = (catMap[catKey].tagCounts[trimmed] ?? 0) + 1
          }
        }
      }
    }

    // 3. Registered categories from Category table
    const registeredCategories = await prisma.category.findMany()
    const registeredMap = new Map(registeredCategories.map(c => [c.slug.toLowerCase().trim(), c]))

    // 4. Merge all keys
    const allKeys = Array.from(new Set([...Object.keys(catMap), ...registeredMap.keys()]))

    const result = allKeys.map(key => {
      const stats = catMap[key] ?? { count: 0, tagCounts: {} }
      const reg = registeredMap.get(key)
      const meta = DEFAULT_CATEGORY_META[key]

      const name = reg?.name ?? meta?.name ?? (key.charAt(0).toUpperCase() + key.slice(1))
      const icon = reg?.icon ?? meta?.icon ?? '🏷️'

      const tagsObj: Record<string, number> = { ...stats.tagCounts }
      if (reg?.tags) {
        for (const t of reg.tags) {
          if (tagsObj[t] === undefined) {
            tagsObj[t] = 0
          }
        }
      }

      const tags = Object.entries(tagsObj)
        .map(([tagName, tagCount]) => ({ name: tagName, count: tagCount }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

      return {
        id: key,
        name,
        icon,
        count: stats.count,
        tags,
      }
    })

    return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  })
  .post('/categories', async ({ body, set }) => {
    const data = body as {
      name: string
      icon?: string
      tags?: string[]
    }
    if (!data.name || !data.name.trim()) {
      set.status = 400
      return { error: 'Le nom de la catégorie est requis' }
    }
    const trimmedName = data.name.trim()
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || trimmedName.toLowerCase()
    const icon = data.icon?.trim() || '🏷️'
    const tags = (data.tags ?? []).map(t => t.trim()).filter(Boolean)

    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      const updated = await prisma.category.update({
        where: { slug },
        data: {
          name: trimmedName,
          icon,
          tags: Array.from(new Set([...existing.tags, ...tags])),
        },
      })
      return updated
    }

    const created = await prisma.category.create({
      data: {
        slug,
        name: trimmedName,
        icon,
        tags,
      },
    })
    return created
  })
  .post('/categories/:slug/tags', async ({ params, body, set }) => {
    const { tag } = body as { tag: string }
    if (!tag || !tag.trim()) {
      set.status = 400
      return { error: 'Le tag est requis' }
    }
    const trimmedTag = tag.trim()
    const slug = params.slug.toLowerCase().trim()

    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      if (!existing.tags.includes(trimmedTag)) {
        await prisma.category.update({
          where: { slug },
          data: { tags: [...existing.tags, trimmedTag] },
        })
      }
    } else {
      await prisma.category.create({
        data: {
          slug,
          name: params.slug.charAt(0).toUpperCase() + params.slug.slice(1),
          tags: [trimmedTag],
        },
      })
    }
    return { success: true, tag: trimmedTag }
  })
  .get('/tags', async () => {
    const questions = await prisma.question.findMany({
      select: { tags: true },
    })
    const tagCounts: Record<string, number> = {}
    for (const q of questions) {
      if (Array.isArray(q.tags)) {
        for (const t of q.tags) {
          const trimmed = t.trim()
          if (trimmed) {
            tagCounts[trimmed] = (tagCounts[trimmed] ?? 0) + 1
          }
        }
      }
    }
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  })
  .get('/count', async ({ query }) => {
    const where = buildWhereClause(query as Record<string, string | undefined>)

    const count = await prisma.question.count({ where })
    return { count }
  })
