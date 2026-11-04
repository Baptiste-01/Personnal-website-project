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

export interface ImportedQuestionItem {
  id: string
  text: string
  answer: string
  acceptedAnswers: string[]
  category: string
  difficulty: string
  imageUrl?: string | null
  tags: string[]
  status: 'inserted' | 'updated'
}

/* ─── Helper: parse Markdown tables ──────────────────────────── */
function parseMarkdownTables(content: string, defaultName: string): Array<{ sheetName: string; rows: Record<string, unknown>[] }> {
  const lines = content.split(/\r?\n/)
  const sheets: Array<{ sheetName: string; rows: Record<string, unknown>[] }> = []
  let currentCategory = defaultName
  let currentHeaders: string[] = []
  let currentRows: Record<string, unknown>[] = []
  let inTable = false

  const commitSection = () => {
    if (currentRows.length > 0) {
      sheets.push({
        sheetName: currentCategory,
        rows: currentRows,
      })
      currentRows = []
    }
    currentHeaders = []
    inTable = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    // Detect Markdown headings: # Categorie or ## Categorie
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/)
    if (headerMatch && headerMatch[1]) {
      commitSection()
      currentCategory = headerMatch[1].trim()
      continue
    }

    // Detect Markdown table row
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line
        .slice(1, -1)
        .split('|')
        .map(c => {
          let val = c.trim()
          // Extract URL if markdown link [text](https://...)
          const linkMatch = val.match(/^\[.*?\]\((https?:\/\/[^\s)]+)\)$/)
          if (linkMatch && linkMatch[1]) val = linkMatch[1]
          return val
        })

      // Check if separator line (| --- | :---: | --- |)
      const isSeparator = cells.length > 0 && cells.every(c => /^[-:\s]+$/.test(c))
      if (isSeparator) {
        inTable = true
        continue
      }

      // If we haven't hit the separator yet, this row is the header
      if (!inTable) {
        currentHeaders = cells
        continue
      }

      // Data row
      if (currentHeaders.length > 0) {
        const rowObj: Record<string, unknown> = {}
        currentHeaders.forEach((h, idx) => {
          rowObj[h] = cells[idx] ?? ''
        })
        currentRows.push(rowObj)
      }
    } else if (inTable && line === '') {
      // Empty line ends current table
      commitSection()
    }
  }

  commitSection()
  return sheets
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
  /** POST /admin/import — upload a .xlsx, .xls or .md file, parse and upsert questions */
  .post('/import', async ({ request, set }) => {
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        set.status = 400
        return { error: 'Aucun fichier fourni. Envoyez un fichier .xlsx, .xls ou .md dans le champ "file".' }
      }

      const isXlsx = /\.(xlsx|xls)$/i.test(file.name)
      const isMd = /\.(md|markdown)$/i.test(file.name)

      if (!isXlsx && !isMd) {
        set.status = 400
        return { error: 'Format invalide. Seuls les fichiers .xlsx, .xls et .md sont acceptés.' }
      }

      const sheets: Array<{ sheetName: string; rows: Record<string, unknown>[] }> = []

      if (isXlsx) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          if (!sheet) continue
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
          sheets.push({ sheetName, rows })
        }
      } else {
        const text = await file.text()
        const defaultCategory = file.name.replace(/\.[^.]+$/, '').trim() || 'Général'
        const mdSheets = parseMarkdownTables(text, defaultCategory)
        sheets.push(...mdSheets)
      }

      const results: ImportResult[] = []
      const importedQuestions: ImportedQuestionItem[] = []
      let totalInserted = 0
      let totalUpdated = 0
      let totalSkipped = 0

      // Process each sheet/section as a category
      for (const { sheetName, rows } of sheets) {
        const category = sheetName.toLowerCase().trim()

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
              const updated = await prisma.question.update({
                where: { id: existing.id },
                data: {
                  text: questionText,
                  answer,
                  acceptedAnswers,
                  hint: null,
                  category,
                  difficulty,
                  imageUrl,
                  ...(tags.length > 0 ? { tags } : {}),
                },
              })
              result.updated++
              totalUpdated++
              importedQuestions.push({
                id: updated.id,
                text: updated.text,
                answer: updated.answer,
                acceptedAnswers: updated.acceptedAnswers,
                category: updated.category,
                difficulty: updated.difficulty,
                imageUrl: updated.imageUrl,
                tags: updated.tags,
                status: 'updated',
              })
            } else {
              const created = await prisma.question.create({
                data: { text: questionText, answer, acceptedAnswers, hint: null, category, difficulty, imageUrl, tags },
              })
              result.inserted++
              totalInserted++
              importedQuestions.push({
                id: created.id,
                text: created.text,
                answer: created.answer,
                acceptedAnswers: created.acceptedAnswers,
                category: created.category,
                difficulty: created.difficulty,
                imageUrl: created.imageUrl,
                tags: created.tags,
                status: 'inserted',
              })
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
          sheetsProcessed: sheets.length,
          totalInserted,
          totalUpdated,
          totalSkipped,
        },
        details: results,
        importedQuestions,
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

    const HEADERS = ['question', 'réponse', 'réponses_acceptées', 'difficulté', 'image_url', 'tags']

    const EXAMPLES: Record<string, string[][]> = {
      'Mythologie & Légendes': [
        ["Dans la mythologie grecque, qui est le roi des dieux et le maître de la foudre ?", 'Zeus', 'zeus', 'easy', '', 'Grec'],
        ["Dans la mythologie grecque, qui est la déesse de la sagesse et de la stratégie militaire ?", 'Athéna', 'athena,athéna', 'easy', '', 'Grec'],
        ["Dans la mythologie romaine, qui est le souverain des dieux, équivalent de Zeus ?", 'Jupiter', 'jupiter', 'easy', '', 'Romain'],
        ["Dans la mythologie romaine, qui est le dieu de la guerre ?", 'Mars', 'mars', 'easy', '', 'Romain'],
        ["Dans la mythologie nordique, quel dieu brandit le redoutable marteau Mjöllnir ?", 'Thor', 'thor', 'easy', '', 'Nordique'],
        ["Dans la mythologie égyptienne, qui est le dieu du Soleil créateur de l'univers ?", 'Râ', 'ra,râ', 'easy', '', 'Égyptien'],
      ],
      Capitale: [
        ["Quelle est la capitale de la France ?", 'Paris', 'paris', 'easy', '', 'Europe'],
        ["Quelle est la capitale de l'Allemagne ?", 'Berlin', 'berlin', 'easy', '', 'Europe'],
        ["Quelle est la capitale du Japon ?", 'Tokyo', 'tokyo', 'easy', '', 'Asie'],
        ["Quelle est la capitale du Sénégal ?", 'Dakar', 'dakar', 'easy', '', 'Afrique'],
      ],
      geographie: [
        ['Quelle est la capitale de la France ?', 'Paris', 'paris,Paris', 'easy', '', 'France,Capitale'],
        ['Quel est ce célèbre monument de Paris ?', 'Tour Eiffel', 'tour eiffel,eiffel', 'easy', 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?w=600&auto=format&fit=crop', 'France,Monument'],
        ["Quel est le plus petit pays du monde ?", 'Vatican', 'vatican,le vatican', 'normal', '', 'Europe,Vatican'],
        ["Quelle est la capitale de la Mongolie ?", 'Oulan-Bator', 'oulan-bator,ulaanbaatar', 'hard', '', 'Asie,Capitale'],
      ],
      histoire: [
        ["Qui a peint ce célèbre chef-d'œuvre ?", 'Leonard de Vinci', 'leonard de vinci,da vinci,vinci', 'easy', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa_%28Leonardo_da_Vinci%29.jpg/300px-Mona_Lisa_%28Leonardo_da_Vinci%29.jpg', 'Art,Renaissance'],
        ["En quelle année a débuté la Révolution française ?", '1789', '1789', 'facile', '', 'France,Révolution'],
        ["En quelle année le mur de Berlin est-il tombé ?", '1989', '1989', 'normal', '', 'Europe,Guerre froide'],
      ],
      sciences: [
        ["Quelle est cette planète aux spectaculaires anneaux ?", 'Saturne', 'saturne,saturn', 'easy', 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600&auto=format&fit=crop', 'Astronomie,Planète'],
        ["Quel est le symbole chimique de l'eau ?", 'H2O', 'h2o', 'easy', '', 'Chimie'],
        ["Quel est le plus grand organe du corps humain ?", 'Peau', 'peau,la peau', 'medium', '', 'Biologie,Corps humain'],
      ],
    }

    const workbook = XLSX.utils.book_new()

    for (const cat of CATEGORIES) {
      const examples = EXAMPLES[cat] ?? []
      const data = [HEADERS, ...examples]
      const sheet = XLSX.utils.aoa_to_sheet(data)

      // Auto-width columns
      sheet['!cols'] = [{ wch: 50 }, { wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 50 }, { wch: 25 }]

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

  /** GET /admin/export — export all questions from database as Excel (.xlsx) or Markdown (.md) */
  .get('/export', async ({ query, set }) => {
    try {
      const format = ((query.format as string) || 'xlsx').toLowerCase().trim()
      const allQuestions = await prisma.question.findMany({
        orderBy: [{ category: 'asc' }, { id: 'asc' }],
      })

      if (format === 'md' || format === 'markdown') {
        const byCat = new Map<string, typeof allQuestions>()
        for (const q of allQuestions) {
          const cat = q.category || 'Général'
          if (!byCat.has(cat)) byCat.set(cat, [])
          byCat.get(cat)!.push(q)
        }

        let mdContent = `# Smik Party — Export de toutes les questions (${allQuestions.length} questions)\n\n`
        for (const [cat, questions] of byCat.entries()) {
          mdContent += `## ${cat}\n\n`
          mdContent += `| question | réponse | réponses_acceptées | difficulté | image_url | tag |\n`
          mdContent += `| --- | --- | --- | --- | --- | --- |\n`
          for (const q of questions) {
            const clean = (s: string | null | undefined) => (s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
            const accepted = Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(', ') : clean(q.answer)
            const tags = Array.isArray(q.tags) ? q.tags.join(', ') : ''
            mdContent += `| ${clean(q.text)} | ${clean(q.answer)} | ${clean(accepted)} | ${clean(q.difficulty)} | ${clean(q.imageUrl)} | ${clean(tags)} |\n`
          }
          mdContent += `\n`
        }

        return new Response(mdContent, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': 'attachment; filename="smik_party_all_questions.md"',
          },
        })
      }

      // Default: XLSX
      const workbook = XLSX.utils.book_new()
      const byCat = new Map<string, typeof allQuestions>()
      for (const q of allQuestions) {
        const cat = q.category || 'Général'
        if (!byCat.has(cat)) byCat.set(cat, [])
        byCat.get(cat)!.push(q)
      }

      const HEADERS = ['question', 'réponse', 'réponses_acceptées', 'difficulté', 'image_url', 'tag']

      for (const [cat, questions] of byCat.entries()) {
        const sheetName = cat.slice(0, 31) // Excel sheet name limit is 31 chars
        const rows = questions.map(q => [
          q.text,
          q.answer,
          Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(', ') : q.answer,
          q.difficulty || 'facile',
          q.imageUrl || '',
          Array.isArray(q.tags) ? q.tags.join(', ') : '',
        ])
        const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows])
        sheet['!cols'] = [{ wch: 45 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 45 }, { wch: 25 }]
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
      }

      if (workbook.SheetNames.length === 0) {
        const sheet = XLSX.utils.aoa_to_sheet([HEADERS])
        XLSX.utils.book_append_sheet(workbook, sheet, 'Questions')
      }

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="smik_party_all_questions.xlsx"',
        },
      })
    } catch (err) {
      set.status = 500
      return { error: `Erreur lors de l'exportation: ${String(err)}` }
    }
  })
