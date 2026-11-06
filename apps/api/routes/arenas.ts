import Elysia from 'elysia'
import prisma from '../lib/prisma'
import { roomManager } from '../ws/roomManager'

export const arenasRoute = new Elysia({ prefix: '/arenas' })
  .get('/', async () => {
    const arenas = await prisma.arena.findMany({ orderBy: { createdAt: 'asc' } })
    return arenas.map(a => {
      const room = roomManager.get(a.id)
      const activePlayers = room ? room.getActivePlayerCount() : (a.players || 0)
      return {
        ...a,
        players: activePlayers,
        status: room ? (activePlayers === 0 ? 'waiting' : room.status) : a.status,
      }
    })
  })
  .get('/:id', async ({ params, set }) => {
    const arena = await prisma.arena.findUnique({ where: { id: params.id } })
    if (!arena) {
      set.status = 404
      return { error: 'Arène introuvable' }
    }
    const room = roomManager.get(arena.id)
    const activePlayers = room ? room.getActivePlayerCount() : (arena.players || 0)
    return {
      ...arena,
      players: activePlayers,
      status: room ? (activePlayers === 0 ? 'waiting' : room.status) : arena.status,
    }
  })
  .post('/', async ({ body, set }) => {
    const data = body as {
      name: string
      maxPlayers?: number
      gameMode?: string
      difficulty?: string
      categories?: string[]
      tags?: string[]
    }

    if (!data.name) {
      set.status = 400
      return { error: 'Le nom est requis' }
    }

    const created = await prisma.arena.create({
      data: {
        name: data.name,
        maxPlayers: typeof data.maxPlayers === 'number' ? data.maxPlayers : 0,
        gameMode: data.gameMode ?? 'flashguess',
        difficulty: data.difficulty ?? 'facile',
        categories: data.categories ?? ['geographie', 'histoire', 'sciences'],
        tags: data.tags ?? [],
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
  .delete('/:id', async ({ params, headers, set }) => {
    const token = (headers['authorization'] ?? '').replace('Bearer ', '')
    if (token) {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      })
      if (!session || !session.user?.isAdmin) {
        set.status = 403
        return { error: 'Action réservée aux administrateurs.' }
      }
    } else {
      set.status = 401
      return { error: 'Authentification requise.' }
    }

    const arena = await prisma.arena.findUnique({ where: { id: params.id } })
    if (!arena) {
      set.status = 404
      return { error: 'Arène introuvable' }
    }
    await prisma.arena.delete({ where: { id: params.id } })
    roomManager.delete(params.id)
    return { success: true }
  })
