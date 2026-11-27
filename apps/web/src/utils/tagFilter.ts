import type { Difficulty, GameSettings } from '../types'

/** Canonical normalization key matching backend getCanonicalCategoryKey for alias-safe client state. */
export function getCanonicalClientCategoryKey(str: string): string {
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

/** Check whether a category (or any canonical alias of it) is present in a list. */
export function hasCanonicalCategory(categories: string[], targetCat: string): boolean {
  const targetCanonical = getCanonicalClientCategoryKey(targetCat)
  return categories.some(c => getCanonicalClientCategoryKey(c) === targetCanonical)
}

/** Toggle a category by canonical key, removing all aliases when unchecking and respecting minCount. */
export function toggleCanonicalCategory(
  categories: string[],
  targetCat: string,
  minCount = 0
): string[] {
  const targetCanonical = getCanonicalClientCategoryKey(targetCat)
  const has = categories.some(c => getCanonicalClientCategoryKey(c) === targetCanonical)
  if (has) {
    const next = categories.filter(c => getCanonicalClientCategoryKey(c) !== targetCanonical)
    const uniqueCanonicalCount = new Set(categories.map(getCanonicalClientCategoryKey)).size
    if (uniqueCanonicalCount <= minCount) return categories
    return next
  }
  return [...categories, targetCat]
}

/** Map stored category aliases to the active API category IDs and deduplicate by canonical key. */
export function normalizeCategoriesToAvailable(
  categories: string[],
  available: Array<{ id: string }>
): string[] {
  if (available.length === 0) return categories
  const availableByCanonical = new Map<string, string>()
  for (const item of available) {
    const key = getCanonicalClientCategoryKey(item.id)
    if (!availableByCanonical.has(key)) {
      availableByCanonical.set(key, item.id)
    }
  }
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const cat of categories) {
    const key = getCanonicalClientCategoryKey(cat)
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(availableByCanonical.get(key) ?? cat)
  }
  return normalized
}

/** Update categoryDifficulties cleanly, keeping all canonical alias keys (e.g. drapeau & drapeaux) synchronized. */
export function setCanonicalCategoryDifficulties(
  map: Record<string, Difficulty[]>,
  targetCat: string,
  diffs: Difficulty[]
): Record<string, Difficulty[]> {
  const targetCanonical = getCanonicalClientCategoryKey(targetCat)
  const next: Record<string, Difficulty[]> = { ...map, [targetCat]: diffs }
  for (const key of Object.keys(next)) {
    if (getCanonicalClientCategoryKey(key) === targetCanonical) {
      next[key] = diffs
    }
  }
  return next
}

/** Parse URL parameter encoded as "cat1:val1+val2,cat2:val3" into a Record. */
export function parseCategoryListParam(raw: string | null): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  if (!raw) return result
  raw.split(',').filter(Boolean).forEach(entry => {
    const colonIdx = entry.indexOf(':')
    if (colonIdx <= 0) return
    const cat = entry.slice(0, colonIdx).trim()
    const items = entry
      .slice(colonIdx + 1)
      .split('+')
      .map(s => s.trim())
      .filter(Boolean)
    if (cat && items.length > 0) {
      result[cat] = items
    }
  })
  return result
}

/** Serialize a Record<category, values[]> into "cat1:val1+val2,cat2:val3", deduplicating aliases. */
export function serializeCategoryListMap(
  map: Record<string, string[]> | undefined,
  activeCategories?: string[]
): string {
  if (!map) return ''
  const activeExactSet =
    activeCategories && activeCategories.length > 0
      ? new Set(activeCategories.map(c => c.toLowerCase().trim()))
      : null
  const activeCanonicalSet =
    activeCategories && activeCategories.length > 0
      ? new Set(activeCategories.map(c => getCanonicalClientCategoryKey(c)))
      : null

  const deduped = new Map<string, { outKey: string; vals: string[]; isExact: boolean }>()
  for (const [cat, vals] of Object.entries(map)) {
    if (!Array.isArray(vals) || vals.length === 0) continue
    const canonical = getCanonicalClientCategoryKey(cat)
    if (activeCanonicalSet && !activeCanonicalSet.has(canonical)) continue
    const isExact = Boolean(activeExactSet && activeExactSet.has(cat.toLowerCase().trim()))
    const prev = deduped.get(canonical)
    if (!prev || isExact || !prev.isExact) {
      deduped.set(canonical, { outKey: cat, vals, isExact })
    }
  }

  return Array.from(deduped.values())
    .map(({ outKey, vals }) => `${outKey}:${vals.join('+')}`)
    .join(',')
}

/** Summarize included & banned tags across all categories for template previews. */
export function getTemplateTagSummary(settings: Partial<GameSettings>) {
  const includedEntries = Object.entries(settings.categoryTags ?? {}).filter(
    ([, tags]) => Array.isArray(tags) && tags.length > 0
  )
  const bannedEntries = Object.entries(settings.bannedCategoryTags ?? {}).filter(
    ([, tags]) => Array.isArray(tags) && tags.length > 0
  )
  const globalBanned = (settings.bannedTags ?? []).filter(Boolean)

  const totalIncluded = includedEntries.reduce((acc, [, tags]) => acc + tags.length, 0)
  const totalBanned =
    bannedEntries.reduce((acc, [, tags]) => acc + tags.length, 0) + globalBanned.length

  const bannedFlat = [
    ...bannedEntries.flatMap(([cat, tags]) => tags.map(t => ({ cat, tag: t }))),
    ...globalBanned.map(tag => ({ cat: '', tag })),
  ]

  return {
    includedEntries,
    bannedEntries,
    totalIncluded,
    totalBanned,
    bannedFlat,
  }
}

/** Parse difficulty speedrun times encoded as "facile:3,moyen:5,difficile:8" into a Record<string, number>. */
export function parseDifficultyTimesMap(raw?: string | null): Record<string, number> {
  const map: Record<string, number> = {}
  if (!raw) return map
  raw.split(',').filter(Boolean).forEach(entry => {
    const colonIdx = entry.indexOf(':')
    if (colonIdx <= 0) return
    const diff = entry.slice(0, colonIdx).trim().toLowerCase()
    const timeVal = Number(entry.slice(colonIdx + 1).trim())
    if (diff && !isNaN(timeVal) && timeVal > 0) {
      map[diff] = timeVal
    }
  })
  return map
}

/** Serialize Record<difficulty, seconds> into "facile:3,moyen:5,difficile:8". */
export function serializeDifficultyTimesMap(map?: Record<string, number>): string | undefined {
  if (!map || typeof map !== 'object') return undefined
  const entries = Object.entries(map).filter(([_, time]) => typeof time === 'number' && time > 0)
  if (entries.length === 0) return undefined
  return entries.map(([diff, time]) => `${diff}:${time}`).join(',')
}

/** Parse category speedrun times encoded as "capitale:3,geographie:5" into a Record<string, number>. */
export function parseCategoryTimesMap(raw?: string | null): Record<string, number> {
  const map: Record<string, number> = {}
  if (!raw) return map
  raw.split(',').filter(Boolean).forEach(entry => {
    const colonIdx = entry.indexOf(':')
    if (colonIdx <= 0) return
    const cat = entry.slice(0, colonIdx).trim().toLowerCase()
    const timeVal = Number(entry.slice(colonIdx + 1).trim())
    if (cat && !isNaN(timeVal) && timeVal > 0) {
      map[cat] = timeVal
    }
  })
  return map
}

/** Serialize Record<category, seconds> into "capitale:3,geographie:5". */
export function serializeCategoryTimesMap(
  map?: Record<string, number>,
  activeCategories?: string[]
): string | undefined {
  if (!map || typeof map !== 'object') return undefined
  const activeSet =
    activeCategories && activeCategories.length > 0
      ? new Set(activeCategories.map(c => c.toLowerCase().trim()))
      : null
  const entries = Object.entries(map).filter(([cat, time]) => {
    if (typeof time !== 'number' || time <= 0) return false
    return !activeSet || activeSet.has(cat.toLowerCase().trim())
  })
  if (entries.length === 0) return undefined
  return entries.map(([cat, time]) => `${cat}:${time}`).join(',')
}

