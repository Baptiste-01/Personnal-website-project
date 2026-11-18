import Elysia from 'elysia'
import prisma from '../lib/prisma'

/* ─── Helpers ────────────────────────────────────────────────────────── */
async function getAdminUser(headers: Record<string, string | undefined>) {
  const authHeader = headers['authorization'] || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { token } }).catch(() => {})
      return null
    }
    if (!session.user || !session.user.isAdmin) {
      return null
    }
    return session.user
  } catch {
    return null
  }
}

/* ─── Admin Users Route ──────────────────────────────────────────────── */
export const adminUsersRoute = new Elysia({ prefix: '/admin/users' })

  /**
   * GET /admin/users
   * List all users with search, filtering, and aggregate statistics
   */
  .get('/', async ({ headers, query, set }) => {
    const admin = await getAdminUser(headers)
    if (!admin) {
      set.status = 403
      return { error: 'Accès interdit. Droits administrateur requis.' }
    }

    try {
      const search = (query.search || '').trim()
      const role = query.role || 'all'
      const sortBy = query.sortBy || 'createdAt'
      const order = query.order === 'asc' ? 'asc' : 'desc'

      // Build where clause
      const where: any = {}

      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ]
      }

      if (role === 'admin') {
        where.isAdmin = true
      } else if (role === 'player') {
        where.isAdmin = false
      }

      // Valid sorting keys
      const validSortFields: Record<string, string> = {
        createdAt: 'createdAt',
        xp: 'xp',
        level: 'level',
        gamesPlayed: 'gamesPlayed',
        gamesWon: 'gamesWon',
        totalPoints: 'totalPoints',
        username: 'username',
      }
      const orderByField = validSortFields[sortBy] || 'createdAt'

      const users = await prisma.user.findMany({
        where,
        orderBy: { [orderByField]: order },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          isAdmin: true,
          level: true,
          xp: true,
          totalPoints: true,
          gamesPlayed: true,
          gamesWon: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              templates: true,
              achievements: true,
              gameHistory: true,
            },
          },
        },
      })

      // Overall database stats
      const [totalUsers, totalAdmins, aggregates] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isAdmin: true } }),
        prisma.user.aggregate({
          _sum: {
            gamesPlayed: true,
            gamesWon: true,
            xp: true,
            totalPoints: true,
          },
        }),
      ])

      return {
        users,
        total: users.length,
        stats: {
          totalUsers,
          totalAdmins,
          totalPlayers: totalUsers - totalAdmins,
          totalGamesPlayed: aggregates._sum.gamesPlayed || 0,
          totalGamesWon: aggregates._sum.gamesWon || 0,
          totalXp: aggregates._sum.xp || 0,
          totalPoints: aggregates._sum.totalPoints || 0,
        },
      }
    } catch (err) {
      set.status = 500
      return { error: `Erreur lors de la récupération des utilisateurs : ${String(err)}` }
    }
  })

  /**
   * DELETE /admin/users/:id
   * Permanently delete a user account and associated cascade data
   */
  .delete('/:id', async ({ headers, params, set }) => {
    const admin = await getAdminUser(headers)
    if (!admin) {
      set.status = 403
      return { error: 'Accès interdit. Droits administrateur requis.' }
    }

    const { id } = params
    if (id === admin.id) {
      set.status = 400
      return { error: 'Vous ne pouvez pas supprimer votre propre compte administrateur.' }
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, isAdmin: true },
      })

      if (!targetUser) {
        set.status = 404
        return { error: 'Utilisateur introuvable.' }
      }

      await prisma.user.delete({
        where: { id },
      })

      return {
        success: true,
        message: `Le compte "${targetUser.username}" a été définitivement supprimé.`,
        deletedUserId: id,
      }
    } catch (err) {
      set.status = 500
      return { error: `Impossible de supprimer l'utilisateur : ${String(err)}` }
    }
  })

  /**
   * POST /admin/users/:id/reset-stats
   * Reset player level, XP, points, game statistics, and history to 0
   */
  .post('/:id/reset-stats', async ({ headers, params, set }) => {
    const admin = await getAdminUser(headers)
    if (!admin) {
      set.status = 403
      return { error: 'Accès interdit. Droits administrateur requis.' }
    }

    const { id } = params
    try {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true },
      })

      if (!targetUser) {
        set.status = 404
        return { error: 'Utilisateur introuvable.' }
      }

      // Reset user counters
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          level: 1,
          xp: 0,
          totalPoints: 0,
          gamesPlayed: 0,
          gamesWon: 0,
        },
        select: {
          id: true,
          username: true,
          level: true,
          xp: true,
          totalPoints: true,
          gamesPlayed: true,
          gamesWon: true,
        },
      })

      // Clear recorded game matches for clean history
      await prisma.gameHistory.deleteMany({
        where: { userId: id },
      }).catch(() => {})

      return {
        success: true,
        message: `Les statistiques et l'XP de "${targetUser.username}" ont été remises à zéro.`,
        user: updatedUser,
      }
    } catch (err) {
      set.status = 500
      return { error: `Impossible de réinitialiser les statistiques : ${String(err)}` }
    }
  })

  /**
   * PATCH /admin/users/:id/role
   * Grant or revoke Administrator privileges
   */
  .patch('/:id/role', async ({ headers, params, body, set }) => {
    const admin = await getAdminUser(headers)
    if (!admin) {
      set.status = 403
      return { error: 'Accès interdit. Droits administrateur requis.' }
    }

    const { id } = params
    const b = (body || {}) as { isAdmin?: boolean }

    if (typeof b.isAdmin !== 'boolean') {
      set.status = 400
      return { error: 'Le champ isAdmin (booléen) est requis.' }
    }

    if (id === admin.id && !b.isAdmin) {
      set.status = 400
      return { error: 'Vous ne pouvez pas vous retirer vous-même les droits administrateur.' }
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, isAdmin: true },
      })

      if (!targetUser) {
        set.status = 404
        return { error: 'Utilisateur introuvable.' }
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isAdmin: b.isAdmin },
        select: {
          id: true,
          username: true,
          displayName: true,
          isAdmin: true,
        },
      })

      return {
        success: true,
        message: b.isAdmin
          ? `Le rôle Administrateur a été attribué avec succès à "${targetUser.username}".`
          : `Le rôle Administrateur a été retiré avec succès à "${targetUser.username}".`,
        user: updated,
      }
    } catch (err) {
      set.status = 500
      return { error: `Impossible de modifier le rôle : ${String(err)}` }
    }
  })
