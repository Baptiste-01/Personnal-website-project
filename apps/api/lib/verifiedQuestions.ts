import fs from 'node:fs'
import path from 'node:path'
import prisma from './prisma'

export interface VerifiedQuestionRecord {
  id: string
  verifiedAt: number
  verifiedBy?: string
}

const DATA_DIR = path.resolve(__dirname, '../data')
const FILE_PATH = path.join(DATA_DIR, 'verified-questions.json')

class VerifiedQuestionsStore {
  private records = new Map<string, VerifiedQuestionRecord>()

  constructor() {
    this.load()
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      }
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8')
        const items = JSON.parse(raw.replace(/^\uFEFF/, '')) as VerifiedQuestionRecord[]
        if (Array.isArray(items)) {
          this.records.clear()
          for (const item of items) {
            if (item && item.id) {
              this.records.set(item.id, item)
            }
          }
        }
      }
    } catch (err) {
      console.warn('[VerifiedQuestionsStore] Failed to load verified questions file:', err)
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      }
      const data = Array.from(this.records.values())
      fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
    } catch (err) {
      console.warn('[VerifiedQuestionsStore] Failed to persist verified questions:', err)
    }
  }

  public isVerified(idOrQuestion: string | { id: string; tags?: string[] }): boolean {
    if (!idOrQuestion) return false
    const id = typeof idOrQuestion === 'string' ? idOrQuestion : idOrQuestion.id
    if (this.records.has(id)) return true

    if (typeof idOrQuestion === 'object' && Array.isArray(idOrQuestion.tags)) {
      return idOrQuestion.tags.some(t => t.toLowerCase() === 'verifie' || t.toLowerCase() === 'verified')
    }
    return false
  }

  public getVerifiedIds(): string[] {
    return Array.from(this.records.keys())
  }

  public async verify(
    questionId: string,
    verifiedBy?: string
  ): Promise<{ success: boolean; message: string }> {
    const record: VerifiedQuestionRecord = {
      id: questionId,
      verifiedAt: Date.now(),
      verifiedBy,
    }
    this.records.set(questionId, record)
    this.save()

    try {
      const q = await prisma.question.findUnique({ where: { id: questionId } })
      if (q) {
        const currentTags = Array.isArray(q.tags) ? q.tags : []
        const cleanedTags = currentTags.filter(
          t => t.toLowerCase() !== 'sourdine' && t.toLowerCase() !== 'muted'
        )
        if (!cleanedTags.some(t => t.toLowerCase() === 'verifie' || t.toLowerCase() === 'verified')) {
          cleanedTags.push('verifie')
        }
        await prisma.question.update({
          where: { id: questionId },
          data: { tags: cleanedTags },
        })
      }
    } catch {
      // Prisma / DB might be disconnected in fallback mode; file persistence is active
    }

    return {
      success: true,
      message: `La question #${questionId} a été marquée comme vérifiée.`,
    }
  }

  public async unverify(questionId: string): Promise<{ success: boolean; message: string }> {
    this.records.delete(questionId)
    this.save()

    try {
      const q = await prisma.question.findUnique({ where: { id: questionId } })
      if (q && Array.isArray(q.tags)) {
        const newTags = q.tags.filter(
          t => t.toLowerCase() !== 'verifie' && t.toLowerCase() !== 'verified'
        )
        await prisma.question.update({
          where: { id: questionId },
          data: { tags: newTags },
        })
      }
    } catch {
      // Prisma / DB might be disconnected
    }

    return {
      success: true,
      message: `Le statut vérifié de la question #${questionId} a été retiré.`,
    }
  }
}

export const verifiedQuestionsStore = new VerifiedQuestionsStore()
