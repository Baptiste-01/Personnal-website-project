import type { GameSettings } from '../types'

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

/** Serialize a Record<category, values[]> into "cat1:val1+val2,cat2:val3". */
export function serializeCategoryListMap(
  map: Record<string, string[]> | undefined,
  activeCategories?: string[]
): string {
  if (!map) return ''
  return Object.entries(map)
    .filter(([cat, vals]) => {
      if (!Array.isArray(vals) || vals.length === 0) return false
      return !activeCategories || activeCategories.includes(cat)
    })
    .map(([cat, vals]) => `${cat}:${vals.join('+')}`)
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

