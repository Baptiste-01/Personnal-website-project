import Elysia from 'elysia'
import prisma from '../lib/prisma'

/* ─── Helpers ─── */
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

async function generateUniqueShareCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = ''
    for (let i = 0; i < 4; i++) {
      suffix += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length))
    }
    const code = `TMPL-${suffix}`
    const existing = await prisma.gameTemplate.findUnique({
      where: { shareCode: code },
    })
    if (!existing) return code
  }
  // Fallback with timestamp slice
  return `TMPL-${Date.now().toString(36).toUpperCase().slice(-5)}`
}

async function getAuthUser(headers: Record<string, string | undefined>) {
  const rawAuth = headers['authorization'] || headers['Authorization'] || ''
  const token = rawAuth.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { token } }).catch(() => {})
    return null
  }

  return session.user
}

/* ─── Routes ─── */
export const templatesRoute = new Elysia({ prefix: '/templates' })

  /* ── 1. Mes templates (Auth requis) ───────────────────────── */
  .get('/my', async ({ headers, set }) => {
    const user = await getAuthUser(headers)
    if (!user) {
      set.status = 401
      return { error: 'Authentification requise.' }
    }

    const templates = await prisma.gameTemplate.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return templates
  })

  /* ── 2. Templates publics de la communauté ─────────────────── */
  .get('/public', async () => {
    const templates = await prisma.gameTemplate.findMany({
      where: { isPublic: true },
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return templates
  })

  /* ── 3. Récupérer un template par son code de partage ─────── */
  .get('/code/:shareCode', async ({ params, query, set }) => {
    const cleanCode = (params.shareCode || '').trim().toUpperCase()
    const template = await prisma.gameTemplate.findUnique({
      where: { shareCode: cleanCode },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!template) {
      set.status = 404
      return { error: 'Modèle introuvable pour ce code.' }
    }

    // Incrémente le compteur d'utilisation si spécifié (?use=true)
    if (query && 'use' in query) {
      await prisma.gameTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {})
    }

    return template
  })

  /* ── 4. Créer un nouveau template (Auth requis) ───────────── */
  .post('/', async ({ body, headers, set }) => {
    const user = await getAuthUser(headers)
    if (!user) {
      set.status = 401
      return { error: 'Authentification requise pour créer un modèle.' }
    }

    const data = body as {
      name?: string
      description?: string
      isPublic?: boolean
      settings?: any
    }

    const name = (data.name || '').trim()
    if (!name || name.length < 2) {
      set.status = 400
      return { error: 'Le nom du modèle doit contenir au moins 2 caractères.' }
    }

    if (!data.settings || typeof data.settings !== 'object') {
      set.status = 400
      return { error: 'Les paramètres du modèle sont obligatoires.' }
    }

    const shareCode = await generateUniqueShareCode()

    const created = await prisma.gameTemplate.create({
      data: {
        name,
        description: data.description?.trim() || null,
        isPublic: Boolean(data.isPublic),
        settings: data.settings,
        shareCode,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    set.status = 201
    return created
  })

  /* ── 5. Mettre à jour un template (Auth requis, propriétaire ou admin) ── */
  .put('/:id', async ({ params, body, headers, set }) => {
    const user = await getAuthUser(headers)
    if (!user) {
      set.status = 401
      return { error: 'Authentification requise.' }
    }

    const existing = await prisma.gameTemplate.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      set.status = 404
      return { error: 'Modèle introuvable.' }
    }

    if (existing.userId !== user.id && !user.isAdmin) {
      set.status = 403
      return { error: 'Action non autorisée sur ce modèle.' }
    }

    const data = body as {
      name?: string
      description?: string
      isPublic?: boolean
      settings?: any
    }

    const updated = await prisma.gameTemplate.update({
      where: { id: params.id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.isPublic !== undefined ? { isPublic: Boolean(data.isPublic) } : {}),
        ...(data.settings ? { settings: data.settings } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return updated
  })

  /* ── 6. Supprimer un template (Auth requis, propriétaire ou admin) ── */
  .delete('/:id', async ({ params, headers, set }) => {
    const user = await getAuthUser(headers)
    if (!user) {
      set.status = 401
      return { error: 'Authentification requise.' }
    }

    const existing = await prisma.gameTemplate.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      set.status = 404
      return { error: 'Modèle introuvable.' }
    }

    if (existing.userId !== user.id && !user.isAdmin) {
      set.status = 403
      return { error: 'Action non autorisée.' }
    }

    await prisma.gameTemplate.delete({
      where: { id: params.id },
    })

    return { success: true }
  })

  /* ── 7. Cloner un template partagé dans son compte (Auth requis) ──── */
  .post('/clone/:shareCode', async ({ params, headers, set }) => {
    const user = await getAuthUser(headers)
    if (!user) {
      set.status = 401
      return { error: 'Authentification requise pour cloner ce modèle.' }
    }

    const cleanCode = (params.shareCode || '').trim().toUpperCase()
    const source = await prisma.gameTemplate.findUnique({
      where: { shareCode: cleanCode },
    })

    if (!source) {
      set.status = 404
      return { error: 'Modèle source introuvable.' }
    }

    const newShareCode = await generateUniqueShareCode()

    const cloned = await prisma.gameTemplate.create({
      data: {
        name: `${source.name} (Copie)`,
        description: source.description,
        isPublic: false,
        settings: source.settings as any,
        shareCode: newShareCode,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    // Incrémente le compteur du modèle source
    await prisma.gameTemplate.update({
      where: { id: source.id },
      data: { usageCount: { increment: 1 } },
    }).catch(() => {})

    set.status = 201
    return cloned
  })

