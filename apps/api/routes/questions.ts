import Elysia from 'elysia'
import prisma from '../lib/prisma'
import { mutedQuestionsStore } from '../lib/mutedQuestions'

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

/** Helper to expand category aliases and variants for query filtering */
export function getCategoryQueryVariants(cat: string): string[] {
  const norm = cat
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  const variants = new Set<string>([cat, cat.trim(), cat.toLowerCase().trim()])

  if (norm === 'mythologie' || norm.includes('mythologie')) {
    variants.add('mythologie')
    variants.add('Mythologie & Légende')
    variants.add('mythologie & légende')
    variants.add('Mythologie & Légendes')
    variants.add('mythologie & légendes')
    variants.add('mythologie-l-gende')
    variants.add('mythologie-legende')
  }
  if (norm.includes('animaux') || norm.includes('dinosaures')) {
    variants.add('Animaux & Dinosaures')
    variants.add('animaux & dinosaures')
    variants.add('animaux-dinosaures')
  }
  if (norm.includes('jeux') || norm.includes('video') || norm.includes('vid-o')) {
    variants.add('Jeux Vidéo')
    variants.add('jeux vidéo')
    variants.add('jeux video')
    variants.add('jeux-video')
    variants.add('jeux-vid-o')
  }
  if (norm.includes('anime') || norm.includes('manga')) {
    variants.add('Anime & Manga')
    variants.add('anime & manga')
    variants.add('anime-manga')
  }
  if (norm === 'capitale' || norm === 'capitales') {
    variants.add('capitale')
    variants.add('capitales')
    variants.add('Capitale')
    variants.add('Capitales')
  }
  if (norm === 'drapeau' || norm === 'drapeaux') {
    variants.add('drapeau')
    variants.add('drapeaux')
    variants.add('Drapeau')
    variants.add('Drapeaux')
  }
  if (norm === 'sport' || norm === 'sports') {
    variants.add('sport')
    variants.add('sports')
    variants.add('Sport')
    variants.add('Sports')
  }
  if (norm === 'geographie') {
    variants.add('geographie')
    variants.add('Geographie')
    variants.add('Géographie')
    variants.add('géographie')
  }
  if (norm === 'cinema') {
    variants.add('cinema')
    variants.add('Cinema')
    variants.add('Cinéma')
    variants.add('cinéma')
  }
  if (norm === 'litterature') {
    variants.add('litterature')
    variants.add('Litterature')
    variants.add('Littérature')
    variants.add('littérature')
  }

  return Array.from(variants)
}

export function buildWhereClause(query: Record<string, string | undefined>) {
  const catDiffsMap = parseCategoryListMap(query.catDiffs, d => {
    const norm = normalizeDifficulty(d)
    return norm && norm !== 'mixte' ? norm : undefined
  })
  const catTagsMap = parseCategoryListMap(query.catTags)
  const bannedCatTagsMap = parseCategoryListMap(query.bannedCatTags)
  const userBannedTags = query.bannedTags?.split(',').map(t => t.trim()).filter(Boolean) ?? []
  const globalBannedTags = Array.from(new Set([...userBannedTags, 'sourdine', 'muted']))
  const mutedIds = mutedQuestionsStore.getMutedIds()
  const notMutedIdCondition = mutedIds.length > 0 ? { id: { notIn: mutedIds } } : {}

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
      const variants = getCategoryQueryVariants(cat)
      const cond: Record<string, unknown> = {
        category: { in: variants, mode: 'insensitive' },
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

    const andClauses: Record<string, unknown>[] = [{ OR: orClauses }]
    if (globalBannedTags.length > 0) {
      andClauses.push({ NOT: { tags: { hasSome: globalBannedTags } } })
    }
    if (mutedIds.length > 0) {
      andClauses.push(notMutedIdCondition)
    }

    return andClauses.length > 1 ? { AND: andClauses } : { OR: orClauses }
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
    ...notMutedIdCondition,
  }
}

const DEFAULT_CATEGORY_META: Record<string, { name: string; icon: string }> = {
  mythologie: { name: 'Mythologie & Légendes', icon: '🏛️' },
  'mythologie & légende': { name: 'Mythologie & Légendes', icon: '🏛️' },
  'mythologie & légendes': { name: 'Mythologie & Légendes', icon: '🏛️' },
  'mythologie-legende': { name: 'Mythologie & Légendes', icon: '🏛️' },
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
  sports: { name: 'Sports', icon: '⚽' },
  litterature: { name: 'Littérature', icon: '📚' },
  gastronomie: { name: 'Gastronomie', icon: '🍽️' },
  warframe: { name: 'Warframe', icon: '⚔️' },
  'anime & manga': { name: 'Anime & Manga', icon: '🎌' },
  'anime-manga': { name: 'Anime & Manga', icon: '🎌' },
  'jeux vidéo': { name: 'Jeux Vidéo', icon: '🎮' },
  'jeux video': { name: 'Jeux Vidéo', icon: '🎮' },
  'jeux-video': { name: 'Jeux Vidéo', icon: '🎮' },
  'animaux & dinosaures': { name: 'Animaux & Dinosaures', icon: '🦕' },
  'animaux-dinosaures': { name: 'Animaux & Dinosaures', icon: '🦕' },
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

    // 2. Registered categories from Category table
    const registeredCategories = await prisma.category.findMany()

    // Helper to get a canonical normalization key for category deduplication & matching
    const getCanonicalKey = (str: string): string => {
      const clean = str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/&/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      if (clean === 'mythologie' || clean === 'mythologie-l-gende' || clean === 'mythologie-legendes') {
        return 'mythologie-legende'
      }
      if (clean === 'capitales') return 'capitale'
      if (clean === 'drapeaux') return 'drapeau'
      if (clean === 'sports') return 'sport'
      if (clean === 'jeux-vid-o' || clean === 'jeux-video') return 'jeux-video'
      if (clean === 'anime-manga') return 'anime-manga'
      if (clean === 'animaux-dinosaures') return 'animaux-dinosaures'
      return clean
    }

    interface CategoryAggregator {
      canonicalKey: string
      primaryId: string
      displayName: string
      icon: string
      count: number
      rawVariants: Set<string>
      tagCounts: Record<string, number>
      personnageChildren: Record<string, number>
      registeredMeta?: { name: string; icon?: string; tags: string[] }
    }

    const categoriesMap = new Map<string, CategoryAggregator>()

    // Ingest questions and aggregate by canonical key
    for (const q of questions) {
      if (!q.category) continue
      const rawCat = q.category.trim()
      if (!rawCat) continue
      const cKey = getCanonicalKey(rawCat)

      let item = categoriesMap.get(cKey)
      if (!item) {
        item = {
          canonicalKey: cKey,
          primaryId: rawCat,
          displayName: rawCat,
          icon: '🏷️',
          count: 0,
          rawVariants: new Set(),
          tagCounts: {},
          personnageChildren: {},
        }
        categoriesMap.set(cKey, item)
      }

      item.count++
      item.rawVariants.add(rawCat)

      // Keep the most visually pleasing display name (prefer capitalized over all-lowercase)
      if (rawCat !== rawCat.toLowerCase() && item.displayName === item.displayName.toLowerCase()) {
        item.displayName = rawCat
        item.primaryId = rawCat
      }

      if (Array.isArray(q.tags)) {
        const cleanedTags = q.tags.map(t => t.trim()).filter(Boolean)
        const isAnime = cKey === 'anime-manga'
        const hasPersonnageTag = isAnime && cleanedTags.some(t => t.toLowerCase() === 'personnage')

        for (const trimmed of cleanedTags) {
          item.tagCounts[trimmed] = (item.tagCounts[trimmed] ?? 0) + 1
          if (hasPersonnageTag && trimmed.toLowerCase() !== 'personnage') {
            item.personnageChildren[trimmed] = (item.personnageChildren[trimmed] ?? 0) + 1
          }
        }
      }
    }

    // Merge registered categories metadata
    for (const reg of registeredCategories) {
      const regSlugKey = getCanonicalKey(reg.slug)
      const regNameKey = getCanonicalKey(reg.name)
      const targetKey = categoriesMap.has(regSlugKey) ? regSlugKey : regNameKey

      let item = categoriesMap.get(targetKey)
      if (!item) {
        // Category with 0 questions in Question table
        item = {
          canonicalKey: regSlugKey,
          primaryId: reg.slug,
          displayName: reg.name,
          icon: reg.icon || '🏷️',
          count: 0,
          rawVariants: new Set([reg.slug, reg.name]),
          tagCounts: {},
          personnageChildren: {},
          registeredMeta: reg,
        }
        categoriesMap.set(regSlugKey, item)
      } else {
        item.registeredMeta = reg
        if (reg.name && reg.name.trim()) {
          item.displayName = reg.name.trim()
        }
        if (reg.icon && reg.icon !== '🏷️') {
          item.icon = reg.icon
        }
      }
    }

    // Format final deduplicated list
    const result = Array.from(categoriesMap.values()).map(item => {
      const meta =
        DEFAULT_CATEGORY_META[item.canonicalKey] ||
        DEFAULT_CATEGORY_META[item.primaryId.toLowerCase()] ||
        DEFAULT_CATEGORY_META[item.displayName.toLowerCase()]

      const name = item.registeredMeta?.name || meta?.name || item.displayName
      const icon =
        (item.registeredMeta?.icon && item.registeredMeta.icon !== '🏷️' ? item.registeredMeta.icon : null) ||
        meta?.icon ||
        item.icon ||
        '🏷️'

      const tagsObj: Record<string, number> = { ...item.tagCounts }
      if (item.registeredMeta?.tags) {
        for (const t of item.registeredMeta.tags) {
          if (tagsObj[t] === undefined) {
            tagsObj[t] = 0
          }
        }
      }

      const sortedTags = Object.entries(tagsObj)
        .map(([tagName, tagCount]) => ({ name: tagName, count: tagCount }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

      let finalTags = sortedTags
      let tagChildren: Record<string, { name: string; count: number }[]> | undefined

      if (item.canonicalKey === 'anime-manga') {
        const parentTag = sortedTags.find(t => t.name.toLowerCase() === 'personnage')
        if (parentTag) {
          const childTags = sortedTags.filter(
            t =>
              t.name !== parentTag.name &&
              item.personnageChildren[t.name] !== undefined &&
              item.personnageChildren[t.name] === t.count
          )
          if (childTags.length > 0) {
            const childNameSet = new Set(childTags.map(t => t.name))
            finalTags = sortedTags.filter(t => !childNameSet.has(t.name))
            tagChildren = { [parentTag.name]: childTags }
          }
        }
      }

      return {
        id: item.primaryId,
        name,
        icon,
        count: item.count,
        tags: finalTags,
        ...(tagChildren ? { tagChildren } : {}),
      }
    })

    // Filter out duplicate ghost categories with 0 questions when questions exist in the database
    return result
      .filter(cat => cat.count > 0 || questions.length === 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
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
