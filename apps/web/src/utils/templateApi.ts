import { API_URL } from './config'
import type { GameTemplate, GameSettings } from '../types'

export async function fetchMyTemplates(token: string): Promise<GameTemplate[]> {
  const res = await fetch(`${API_URL}/templates/my`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Impossible de charger vos modèles')
  return res.json()
}

export async function fetchPublicTemplates(): Promise<GameTemplate[]> {
  const res = await fetch(`${API_URL}/templates/public`)
  if (!res.ok) throw new Error('Impossible de charger les modèles publics')
  return res.json()
}

export async function fetchTemplateByCode(shareCode: string, markUsed = false): Promise<GameTemplate> {
  const url = `${API_URL}/templates/code/${encodeURIComponent(shareCode)}${markUsed ? '?use=true' : ''}`
  const res = await fetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Code de modèle invalide ou introuvable')
  }
  return res.json()
}

export async function createTemplate(
  token: string,
  payload: { name: string; description?: string; isPublic?: boolean; settings: GameSettings }
): Promise<GameTemplate> {
  const res = await fetch(`${API_URL}/templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Échec de la création du modèle')
  }
  return res.json()
}

export async function updateTemplate(
  token: string,
  id: string,
  payload: { name?: string; description?: string; isPublic?: boolean; settings?: GameSettings }
): Promise<GameTemplate> {
  const res = await fetch(`${API_URL}/templates/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Échec de la mise à jour du modèle')
  }
  return res.json()
}

export async function deleteTemplate(token: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/templates/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Échec de la suppression du modèle')
  }
  return true
}

export async function cloneTemplate(token: string, shareCode: string): Promise<GameTemplate> {
  const res = await fetch(`${API_URL}/templates/clone/${encodeURIComponent(shareCode)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Échec de la duplication du modèle')
  }
  return res.json()
}

