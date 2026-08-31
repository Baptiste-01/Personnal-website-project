import Elysia from 'elysia'
import prisma from '../lib/prisma'

export const arenasRoute = new Elysia({ prefix: '/arenas' })
  .get('/', async () => {
    return prisma.arena.findMany({ orderBy: { createdAt: 'asc' } })
  })
  .get('/:id', async ({ params, set }) => {
    const arena = await prisma.arena.findUnique({ where: { id: params.id } })
    if (!arena) {
      set.status = 404
      return { error: 'Arène introuvable' }
    }
    return arena
  })
  .post('/', async ({ body, set }) => {
    const data = body as {
      name: string
      maxPlayers?: number
      gameMode?: string
      difficulty?: string
      categories?: string[]
    }

    if (!data.name) {
      set.status = 400
      return { error: 'Le nom est requis' }
    }

    const created = await prisma.arena.create({
      data: {
        name: data.name,
        maxPlayers: data.maxPlayers ?? 20,
        gameMode: data.gameMode ?? 'flashguess',
        difficulty: data.difficulty ?? 'facile',
        categories: data.categories ?? ['geographie', 'histoire', 'sciences'],
      },
    })

    return {
      ...created,
      ...(data as Record<string, unknown>),
    }
  })
  .patch('/:id', async ({ params, body, set }) => {
    const arena = await prisma.arena.findUnique({ where: { id: params.id } })
    if (!arena) {
      set.status = 404
      return { error: 'Arène introuvable' }
    }
    return prisma.arena.update({
      where: { id: params.id },
      data: body as Record<string, unknown>,
    })
  })
  .delete('/:id', async ({ params, set }) => {
    const arena = await prisma.arena.findUnique({ where: { id: params.id } })
    if (!arena) {
      set.status = 404
      return { error: 'Arène introuvable' }
    }
    await prisma.arena.delete({ where: { id: params.id } })
    return { success: true }
  })
