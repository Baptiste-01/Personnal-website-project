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

/** Parse comma-separated category maps encoded as "cat:val1+val2,cat2:val3". */
function parseCategoryListMap(
  raw: string | undefined,
  transform?: (val: string) => string | undefined
): Record<string, string[]> {
  const map: Record<string, string[]> = {}
  if (!raw) return map
  raw.split(',').filter(Boolean).forEach(entry => {
    const colonIdx = entry.indexOf(':')
    if (colonIdx <= 0) return
    const cat = entry.slice(0, colonIdx).toLowerCase().trim()
    const itemsPart = entry.slice(colonIdx + 1)
    if (!cat || !itemsPart) return
    const values = itemsPart
      .split('+')
      .map(v => {
        const trimmed = v.trim()
        return transform ? transform(trimmed) : trimmed
      })
      .filter((v): v is string => Boolean(v))
    if (values.length > 0) {
      map[cat] = values
    }
  })
  return map
}

export function buildWhereClause(query: Record<string, string | undefined>) {
  const catDiffsMap = parseCategoryListMap(query.catDiffs, d => {
    const norm = normalizeDifficulty(d)
    return norm && norm !== 'mixte' ? norm : undefined
  })
  const catTagsMap = parseCategoryListMap(query.catTags)
  const bannedCatTagsMap = parseCategoryListMap(query.bannedCatTags)
  const globalBannedTags = query.bannedTags?.split(',').map(t => t.trim()).filter(Boolean) ?? []

  // Active categories from query.categories or category maps
  const activeCategories = query.categories
    ? query.categories.split(',').map(c => c.toLowerCase().trim()).filter(Boolean)
    : Array.from(
        new Set([
          ...Object.keys(catDiffsMap),
          ...Object.keys(catTagsMap),
          ...Object.keys(bannedCatTagsMap),
        ])
      )

  if (activeCategories.length > 0) {
    const orClauses = activeCategories.map(cat => {
      const cond: Record<string, unknown> = {
        category: { equals: cat, mode: 'insensitive' },
      }
      const diffs = catDiffsMap[cat]
      if (diffs && diffs.length > 0 && diffs.length < 3) {
        cond.difficulty = { in: diffs }
      }
      const includedTags = catTagsMap[cat]
      const bannedTags = bannedCatTagsMap[cat]

      if (includedTags && includedTags.length > 0 && bannedTags && bannedTags.length > 0) {
        cond.AND = [
          { tags: { hasSome: includedTags } },
          { NOT: { tags: { hasSome: bannedTags } } },
        ]
      } else if (includedTags && includedTags.length > 0) {
        cond.tags = { hasSome: includedTags }
      } else if (bannedTags && bannedTags.length > 0) {
        cond.NOT = { tags: { hasSome: bannedTags } }
      }
      return cond
    })

    if (globalBannedTags.length > 0) {
      return {
        AND: [
          { OR: orClauses },
          { NOT: { tags: { hasSome: globalBannedTags } } },
        ],
      }
    }

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
    ...(globalBannedTags.length > 0 ? { NOT: { tags: { hasSome: globalBannedTags } } } : {}),
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
    const catMap: Record<
      string,
      { count: number; tagCounts: Record<string, number>; personnageChildren: Record<string, number> }
    > = {}
    for (const q of questions) {
      const catKey = q.category.toLowerCase().trim()
      if (!catMap[catKey]) {
        catMap[catKey] = { count: 0, tagCounts: {}, personnageChildren: {} }
      }
      catMap[catKey].count++
      if (Array.isArray(q.tags)) {
        const cleanedTags = q.tags.map(t => t.trim()).filter(Boolean)
        const hasPersonnageTag =
          catKey === 'anime & manga' && cleanedTags.some(t => t.toLowerCase() === 'personnage')

        for (const trimmed of cleanedTags) {
          catMap[catKey].tagCounts[trimmed] = (catMap[catKey].tagCounts[trimmed] ?? 0) + 1
          if (hasPersonnageTag && trimmed.toLowerCase() !== 'personnage') {
            catMap[catKey].personnageChildren[trimmed] =
              (catMap[catKey].personnageChildren[trimmed] ?? 0) + 1
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
      const stats = catMap[key] ?? { count: 0, tagCounts: {}, personnageChildren: {} }
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

      const sortedTags = Object.entries(tagsObj)
        .map(([tagName, tagCount]) => ({ name: tagName, count: tagCount }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

      // Group co-occurring secondary tags exclusively under "Personnage" for Anime & Manga
      let finalTags = sortedTags
      let tagChildren: Record<string, { name: string; count: number }[]> | undefined

      if (key === 'anime & manga') {
        const parentTag = sortedTags.find(t => t.name.toLowerCase() === 'personnage')
        if (parentTag) {
          const childTags = sortedTags.filter(
            t =>
              t.name !== parentTag.name &&
              stats.personnageChildren[t.name] !== undefined &&
              stats.personnageChildren[t.name] === t.count
          )
          if (childTags.length > 0) {
            const childNameSet = new Set(childTags.map(t => t.name))
            finalTags = sortedTags.filter(t => !childNameSet.has(t.name))
            tagChildren = { [parentTag.name]: childTags }
          }
        }
      }

      return {
        id: key,
        name,
        icon,
        count: stats.count,
        tags: finalTags,
        ...(tagChildren ? { tagChildren } : {}),
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
