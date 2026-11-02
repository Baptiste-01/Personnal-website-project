import Elysia from 'elysia'
import * as XLSX from 'xlsx'
import prisma from '../lib/prisma'

/* ─── Types ──────────────────────────────────────────────────── */
interface ExcelRow {
  question?: string
  réponse?: string
  reponse?: string
  réponses_acceptées?: string
  reponses_acceptees?: string
  indice?: string
  difficulté?: string
  difficulte?: string
  imageUrl?: string
  tags?: string
}

interface ImportResult {
  sheet: string
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

/* ─── Helper: normalise a row from any column name variant ────── */
function normaliseRow(raw: Record<string, unknown>): ExcelRow {
  const row: ExcelRow = {}
  for (const [key, val] of Object.entries(raw)) {
    const k = key.toLowerCase().trim()
    const v = String(val ?? '').trim()
    if (k === 'question') row.question = v
    else if (k === 'réponse' || k === 'reponse') row.réponse = v
    else if (k === 'réponses_acceptées' || k === 'reponses_acceptees') row.réponses_acceptées = v
    else if (k === 'indice') row.indice = v
    else if (k === 'difficulté' || k === 'difficulte') row.difficulté = v
    else if (k === 'image' || k === 'image_url' || k === 'imageurl' || k === 'image url' || k === 'photo' || k === 'illustration' || k === 'image_link') row.imageUrl = v
    else if (k === 'tags' || k === 'tag') row.tags = v
  }
  return row
}

/* ─── Validate difficulty value ───────────────────────────────── */
const DIFFICULTY_NORMALIZE_MAP: Record<string, string> = {
  facile: 'facile',
  easy: 'facile',
  moyen: 'moyen',
  normal: 'moyen',
  medium: 'moyen',
  difficile: 'difficile',
  hard: 'difficile',
}

function validateDifficulty(val: string | undefined): string {
  const d = (val ?? 'facile').toLowerCase().trim()
  return DIFFICULTY_NORMALIZE_MAP[d] ?? 'facile'
}

/* ─── Route ───────────────────────────────────────────────────── */
export const importRoute = new Elysia({ prefix: '/admin' })
  /** POST /admin/import — upload a .xlsx file, parse and upsert questions */
  .post('/import', async ({ request, set }) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        set.status = 400
        return { error: 'Aucun fichier fourni. Envoyez le fichier xlsx dans le champ "file".' }
      }

      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        set.status = 400
        return { error: 'Format invalide. Seuls les fichiers .xlsx et .xls sont acceptés.' }
      }

      // Read file buffer
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      const results: ImportResult[] = []
      let totalInserted = 0
      let totalUpdated = 0
      let totalSkipped = 0

      // Process each sheet as a category
      for (const sheetName of workbook.SheetNames) {
        const category = sheetName.toLowerCase().trim()
        const sheet = workbook.Sheets[sheetName]
        if (!sheet) continue
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

        const result: ImportResult = {
          sheet: sheetName,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [],
        }

        const sheetTagsSet = new Set<string>()

        for (let i = 0; i < rows.length; i++) {
          const rowData = rows[i]
          if (!rowData) continue
          const raw = normaliseRow(rowData)
          const rowNum = i + 2 // +2 because row 1 = headers

          const questionText = raw.question?.trim()
          const answer = raw.réponse?.trim()

          if (!questionText || !answer) {
            result.skipped++
            result.errors.push(`Ligne ${rowNum}: "question" ou "réponse" manquant — ligne ignorée.`)
            continue
          }

          const acceptedAnswers = raw.réponses_acceptées
            ? raw.réponses_acceptées.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
            : [answer.toLowerCase()]

          const difficulty = validateDifficulty(raw.difficulté)
          const hint = raw.indice ?? null
          const imageUrl = raw.imageUrl?.trim() || null
          const tags = raw.tags
            ? raw.tags.split(/[,;]/).map(s => s.trim()).filter(Boolean)
            : []

          for (const t of tags) {
            sheetTagsSet.add(t)
          }

          try {
            let existing = null

            if (imageUrl) {
              // 1. Match par catégorie et URL d'image identique
              existing = await prisma.question.findFirst({
                where: {
                  category: { equals: category, mode: 'insensitive' },
                  imageUrl,
                },
              })

              // 2. Si non trouvée par URL (ex: changement d'URL), match par catégorie + question + réponse
              if (!existing) {
                existing = await prisma.question.findFirst({
                  where: {
                    category: { equals: category, mode: 'insensitive' },
                    text: { equals: questionText, mode: 'insensitive' },
                    answer: { equals: answer, mode: 'insensitive' },
                  },
                })
              }
            } else {
              // 3. Question textuelle sans image : match par catégorie + texte (sur questions sans image)
              existing = await prisma.question.findFirst({
                where: {
                  category: { equals: category, mode: 'insensitive' },
                  text: { equals: questionText, mode: 'insensitive' },
                  OR: [{ imageUrl: null }, { imageUrl: '' }],
                },
              })

              // Fallback si l'image a été retirée : match par catégorie + texte + réponse
              if (!existing) {
                existing = await prisma.question.findFirst({
                  where: {
                    category: { equals: category, mode: 'insensitive' },
                    text: { equals: questionText, mode: 'insensitive' },
                    answer: { equals: answer, mode: 'insensitive' },
                  },
                })
              }
            }

            if (existing) {
              await prisma.question.update({
                where: { id: existing.id },
                data: {
                  text: questionText,
                  answer,
                  acceptedAnswers,
                  hint,
                  category,
                  difficulty,
                  imageUrl,
                  ...(tags.length > 0 ? { tags } : {}),
                },
              })
              result.updated++
              totalUpdated++
            } else {
              await prisma.question.create({
                data: { text: questionText, answer, acceptedAnswers, hint, category, difficulty, imageUrl, tags },
              })
              result.inserted++
              totalInserted++
            }
          } catch (err) {
            result.errors.push(`Ligne ${rowNum}: erreur DB — ${String(err)}`)
            result.skipped++
            totalSkipped++
          }
        }

        // Register or sync category & tags
        if (result.inserted > 0 || result.updated > 0) {
          try {
            const slug = category.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || category
            const existingCat = await prisma.category.findUnique({ where: { slug } })
            const sheetTags = Array.from(sheetTagsSet)
            if (existingCat) {
              await prisma.category.update({
                where: { slug },
                data: {
                  tags: Array.from(new Set([...existingCat.tags, ...sheetTags])),
                },
              })
            } else {
              await prisma.category.create({
                data: {
                  slug,
                  name: sheetName.trim(),
                  tags: sheetTags,
                },
              })
            }
          } catch (e) {
            console.error('Failed to sync Category from import:', e)
          }
        }

        results.push(result)
      }

      return {
        success: true,
        summary: {
          sheetsProcessed: workbook.SheetNames.length,
          totalInserted,
          totalUpdated,
          totalSkipped,
        },
        details: results,
      }
    } catch (err) {
      set.status = 500
      return { error: `Erreur lors du traitement: ${String(err)}` }
    }
  })

  /** GET /admin/template — download the Excel template */
  .get('/template', () => {
    const CATEGORIES = [
      'Mythologie & Légendes',
      'Capitale',
      'geographie',
      'histoire',
      'sciences',
      'cinema',
      'musique',
      'sport',
      'litterature',
      'gastronomie',
    ]

    const HEADERS = ['question', 'réponse', 'réponses_acceptées', 'indice', 'difficulté', 'image_url', 'tags']

    const EXAMPLES: Record<string, string[][]> = {
      'Mythologie & Légendes': [
        ["Dans la mythologie grecque, qui est le roi des dieux et le maître de la foudre ?", 'Zeus', 'zeus', 'Réside sur l\'Olympe', 'easy', '', 'Grec'],
        ["Dans la mythologie grecque, qui est la déesse de la sagesse et de la stratégie militaire ?", 'Athéna', 'athena,athéna', 'Fille de Zeus', 'easy', '', 'Grec'],
        ["Dans la mythologie romaine, qui est le souverain des dieux, équivalent de Zeus ?", 'Jupiter', 'jupiter', 'Dieu du ciel et de la foudre', 'easy', '', 'Romain'],
        ["Dans la mythologie romaine, qui est le dieu de la guerre ?", 'Mars', 'mars', 'Père de Romulus et Rémus', 'easy', '', 'Romain'],
        ["Dans la mythologie nordique, quel dieu brandit le redoutable marteau Mjöllnir ?", 'Thor', 'thor', 'Dieu du tonnerre', 'easy', '', 'Nordique'],
        ["Dans la mythologie égyptienne, qui est le dieu du Soleil créateur de l'univers ?", 'Râ', 'ra,râ', 'Barque solaire', 'easy', '', 'Égyptien'],
      ],
      Capitale: [
        ["Quelle est la capitale de la France ?", 'Paris', 'paris', 'Ville lumière', 'easy', '', 'Europe'],
        ["Quelle est la capitale de l'Allemagne ?", 'Berlin', 'berlin', 'Porte de Brandebourg', 'easy', '', 'Europe'],
        ["Quelle est la capitale du Japon ?", 'Tokyo', 'tokyo', 'Île de Honshu', 'easy', '', 'Asie'],
        ["Quelle est la capitale du Sénégal ?", 'Dakar', 'dakar', 'Pointe des Almadies', 'easy', '', 'Afrique'],
      ],
      geographie: [
        ['Quelle est la capitale de la France ?', 'Paris', 'paris,Paris', 'Ville lumière', 'easy', '', 'France,Capitale'],
        ['Quel est ce célèbre monument de Paris ?', 'Tour Eiffel', 'tour eiffel,eiffel', 'Construite en 1889', 'easy', 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600&auto=format&fit=crop', 'France,Monument'],
        ["Quel est le plus petit pays du monde ?", 'Vatican', 'vatican,le vatican', 'Enclave dans Rome', 'normal', '', 'Europe,Vatican'],
        ["Quelle est la capitale de la Mongolie ?", 'Oulan-Bator', 'oulan-bator,ulaanbaatar', 'Asie centrale', 'hard', '', 'Asie,Capitale'],
      ],
      histoire: [
        ["Qui a peint ce célèbre chef-d'œuvre ?", 'Leonard de Vinci', 'leonard de vinci,da vinci,vinci', 'Exposé au Louvre', 'easy', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa_%28Leonardo_da_Vinci%29.jpg/300px-Mona_Lisa_%28Leonardo_da_Vinci%29.jpg', 'Art,Renaissance'],
        ["En quelle année a débuté la Révolution française ?", '1789', '1789', 'Prise de la Bastille', 'facile', '', 'France,Révolution'],
        ["En quelle année le mur de Berlin est-il tombé ?", '1989', '1989', 'Fin de la guerre froide', 'normal', '', 'Europe,Guerre froide'],
      ],
      sciences: [
        ["Quelle est cette planète aux spectaculaires anneaux ?", 'Saturne', 'saturne,saturn', '6e planète du système solaire', 'easy', 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop', 'Astronomie,Planète'],
        ["Quel est le symbole chimique de l'eau ?", 'H2O', 'h2o', 'Deux éléments', 'easy', '', 'Chimie'],
        ["Quel est le plus grand organe du corps humain ?", 'Peau', 'peau,la peau', 'Recouvre tout le corps', 'medium', '', 'Biologie,Corps humain'],
      ],
    }

    const workbook = XLSX.utils.book_new()

    for (const cat of CATEGORIES) {
      const examples = EXAMPLES[cat] ?? []
      const data = [HEADERS, ...examples]
      const sheet = XLSX.utils.aoa_to_sheet(data)

      // Auto-width columns
      sheet['!cols'] = [{ wch: 50 }, { wch: 25 }, { wch: 35 }, { wch: 30 }, { wch: 12 }, { wch: 50 }, { wch: 25 }]

      XLSX.utils.book_append_sheet(workbook, sheet, cat)
    }

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="smik_party_questions_template.xlsx"',
      },
    })
  })

  /** GET /admin/stats — question count per category and top tags */
  .get('/stats', async () => {
    const counts = await prisma.question.groupBy({
      by: ['category', 'difficulty'],
      _count: { id: true },
      orderBy: { category: 'asc' },
    })

    const total = await prisma.question.count()

    const allQuestions = await prisma.question.findMany({
      select: { tags: true },
    })
    const tagCounts: Record<string, number> = {}
    for (const q of allQuestions) {
      if (Array.isArray(q.tags)) {
        for (const t of q.tags) {
          const trimmed = t.trim()
          if (trimmed) {
            tagCounts[trimmed] = (tagCounts[trimmed] ?? 0) + 1
          }
        }
      }
    }
    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    return {
      total,
      breakdown: counts.map(c => ({ category: c.category, difficulty: c.difficulty, count: c._count.id })),
      topTags,
    }
  })
