import fs from 'node:fs'
import path from 'node:path'
import prisma from './prisma'

export interface MutedQuestionRecord {
  id: string
  reason?: string
  mutedAt: number
}

const DATA_DIR = path.resolve(__dirname, '../data')
const FILE_PATH = path.join(DATA_DIR, 'muted-questions.json')

class MutedQuestionsStore {
  private records = new Map<string, MutedQuestionRecord>()

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
        const items = JSON.parse(raw.replace(/^\uFEFF/, '')) as MutedQuestionRecord[]
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
      console.warn('[MutedQuestionsStore] Failed to load muted questions file:', err)
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
      console.warn('[MutedQuestionsStore] Failed to persist muted questions:', err)
    }
  }

  public isMuted(idOrQuestion: string | { id: string; tags?: string[] }): boolean {
    if (!idOrQuestion) return false
    const id = typeof idOrQuestion === 'string' ? idOrQuestion : idOrQuestion.id
    if (this.records.has(id)) return true

    if (typeof idOrQuestion === 'object' && Array.isArray(idOrQuestion.tags)) {
      return idOrQuestion.tags.some(t => t.toLowerCase() === 'sourdine' || t.toLowerCase() === 'muted')
    }
    return false
  }

  public getMutedIds(): string[] {
    return Array.from(this.records.keys())
  }

  public getAllRecords(): MutedQuestionRecord[] {
    return Array.from(this.records.values())
  }

  public async mute(questionId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const record: MutedQuestionRecord = {
      id: questionId,
      reason: reason || 'Contient une erreur signalée par un administrateur',
      mutedAt: Date.now(),
    }
    this.records.set(questionId, record)
    this.save()

    // Try updating database if available
    try {
      const q = await prisma.question.findUnique({ where: { id: questionId } })
      if (q) {
        const currentTags = Array.isArray(q.tags) ? q.tags : []
        if (!currentTags.some(t => t.toLowerCase() === 'sourdine')) {
          await prisma.question.update({
            where: { id: questionId },
            data: { tags: [...currentTags, 'sourdine'] },
          })
        }
      }
    } catch (dbErr) {
      // Prisma / DB might be disconnected in fallback mode; file persistence is active
    }

    return {
      success: true,
      message: `La question #${questionId} a été mise en sourdine avec succès.`,
    }
  }

  public async unmute(questionId: string): Promise<{ success: boolean; message: string }> {
    this.records.delete(questionId)
    this.save()

    // Try updating database if available
    try {
      const q = await prisma.question.findUnique({ where: { id: questionId } })
      if (q && Array.isArray(q.tags)) {
        const newTags = q.tags.filter(t => t.toLowerCase() !== 'sourdine' && t.toLowerCase() !== 'muted')
        await prisma.question.update({
          where: { id: questionId },
          data: { tags: newTags },
        })
      }
    } catch (dbErr) {
      // Prisma / DB might be disconnected
    }

    return {
      success: true,
      message: `La question #${questionId} a été retirée de la sourdine.`,
    }
  }
}

export const mutedQuestionsStore = new MutedQuestionsStore()
