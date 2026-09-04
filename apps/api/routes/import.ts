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
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

        const result: ImportResult = {
          sheet: sheetName,
          inserted: 0,
          updated: 0,
          skipped: 0,
          errors: [],
        }

        for (let i = 0; i < rows.length; i++) {
          const raw = normaliseRow(rows[i])
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

          try {
            const existing = await prisma.question.findFirst({
              where: imageUrl
                ? { imageUrl, category }
                : { text: questionText, category },
            })

            if (existing) {
              await prisma.question.update({
                where: { id: existing.id },
                data: { answer, acceptedAnswers, hint, category, difficulty, imageUrl },
              })
              result.updated++
              totalUpdated++
            } else {
              await prisma.question.create({
                data: { text: questionText, answer, acceptedAnswers, hint, category, difficulty, imageUrl },
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
      'geographie',
      'histoire',
      'sciences',
      'cinema',
      'musique',
      'sport',
      'litterature',
      'gastronomie',
    ]

    const HEADERS = ['question', 'réponse', 'réponses_acceptées', 'indice', 'difficulté', 'image_url']

    const EXAMPLES: Record<string, string[][]> = {
      geographie: [
        ['Quelle est la capitale de la France ?', 'Paris', 'paris,Paris', 'Ville lumière', 'easy', ''],
        ['Quel est ce célèbre monument de Paris ?', 'Tour Eiffel', 'tour eiffel,eiffel', 'Construite en 1889', 'easy', 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600&auto=format&fit=crop'],
        ["Quel est le plus petit pays du monde ?", 'Vatican', 'vatican,le vatican', 'Enclave dans Rome', 'normal', ''],
        ["Quelle est la capitale de la Mongolie ?", 'Oulan-Bator', 'oulan-bator,ulaanbaatar', 'Asie centrale', 'hard', ''],
      ],
      histoire: [
        ["Qui a peint ce célèbre chef-d'œuvre ?", 'Leonard de Vinci', 'leonard de vinci,da vinci,vinci', 'Exposé au Louvre', 'easy', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa_%28Leonardo_da_Vinci%29.jpg/300px-Mona_Lisa_%28Leonardo_da_Vinci%29.jpg'],
        ["En quelle année a débuté la Révolution française ?", '1789', '1789', 'Prise de la Bastille', 'facile', ''],
        ["En quelle année le mur de Berlin est-il tombé ?", '1989', '1989', 'Fin de la guerre froide', 'normal', ''],
      ],
      sciences: [
        ["Quelle est cette planète aux spectaculaires anneaux ?", 'Saturne', 'saturne,saturn', '6e planète du système solaire', 'easy', 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop'],
        ["Quel est le symbole chimique de l'eau ?", 'H2O', 'h2o', 'Deux éléments', 'easy', ''],
        ["Quel est le plus grand organe du corps humain ?", 'Peau', 'peau,la peau', 'Recouvre tout le corps', 'medium', ''],
      ],
    }

    const workbook = XLSX.utils.book_new()

    for (const cat of CATEGORIES) {
      const examples = EXAMPLES[cat] ?? []
      const data = [HEADERS, ...examples]
      const sheet = XLSX.utils.aoa_to_sheet(data)

      // Auto-width columns
      sheet['!cols'] = [{ wch: 50 }, { wch: 25 }, { wch: 35 }, { wch: 30 }, { wch: 12 }, { wch: 50 }]

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

  /** GET /admin/stats — question count per category */
  .get('/stats', async () => {
    const counts = await prisma.question.groupBy({
      by: ['category', 'difficulty'],
      _count: { id: true },
      orderBy: { category: 'asc' },
    })

    const total = await prisma.question.count()

    return { total, breakdown: counts.map(c => ({ category: c.category, difficulty: c.difficulty, count: c._count.id })) }
  })
