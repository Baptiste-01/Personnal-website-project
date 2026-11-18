import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../utils/config'
import type { AdminUser, AdminUsersStats } from '../../types'
import { soundManager } from '../../utils/sound'
import './Admin.css'
import './AdminUsers.css'

interface ConfirmState {
  isOpen: boolean
  type: 'delete' | 'reset-stats' | 'toggle-admin'
  targetUser: AdminUser | null
  isPromoting?: boolean
  loading: boolean
}

export default function AdminUsers() {
  const navigate = useNavigate()

  /* ── Auth Verification ────────────────────────────────────────────── */
  const [isAdmin, setIsAdmin] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('auth_user')
    const token = localStorage.getItem('auth_token')
    if (token && userStr) {
      try {
        const u = JSON.parse(userStr)
        setIsAdmin(Boolean(u?.isAdmin))
        setCurrentUserId(u?.id || null)
      } catch {
        setIsAdmin(false)
        setCurrentUserId(null)
      }
    } else {
      setIsAdmin(false)
      setCurrentUserId(null)
    }
    setAuthChecked(true)
  }, [])

  /* ── State ────────────────────────────────────────────────────────── */
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState<AdminUsersStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'player'>('all')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [actionToast, setActionToast] = useState<string | null>(null)

  /* ── Confirmation Modal State ─────────────────────────────────────── */
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    type: 'delete',
    targetUser: null,
    loading: false,
  })

  // Auto-dismiss toast
  useEffect(() => {
    if (!actionToast) return
    const timer = setTimeout(() => setActionToast(null), 3500)
    return () => clearTimeout(timer)
  }, [actionToast])

  /* ── Fetch Users ──────────────────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (roleFilter !== 'all') params.set('role', roleFilter)
      params.set('sortBy', sortBy)
      params.set('order', sortOrder)

      const res = await fetch(`${API_URL}/admin/users?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.status === 401 || res.status === 403) {
        setIsAdmin(false)
        setError('Droits administrateur expirés ou insuffisants.')
        return
      }

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errJson.error || `Erreur serveur HTTP ${res.status}`)
      }

      const data = (await res.json()) as { users: AdminUser[]; stats: AdminUsersStats }
      setUsers(data.users || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, sortBy, sortOrder])

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [isAdmin, fetchUsers])

  /* ── Modal Opening Helpers ────────────────────────────────────────── */
  const handleOpenDelete = (user: AdminUser) => {
    soundManager.playClick()
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      targetUser: user,
      loading: false,
    })
  }

  const handleOpenResetStats = (user: AdminUser) => {
    soundManager.playClick()
    setConfirmModal({
      isOpen: true,
      type: 'reset-stats',
      targetUser: user,
      loading: false,
    })
  }

  const handleOpenToggleAdmin = (user: AdminUser) => {
    soundManager.playClick()
    setConfirmModal({
      isOpen: true,
      type: 'toggle-admin',
      targetUser: user,
      isPromoting: !user.isAdmin,
      loading: false,
    })
  }

  const handleCloseModal = () => {
    if (confirmModal.loading) return
    soundManager.playClick()
    setConfirmModal({
      isOpen: false,
      type: 'delete',
      targetUser: null,
      loading: false,
    })
  }

  /* ── Confirm Action Execution ─────────────────────────────────────── */
  const handleExecuteConfirm = async () => {
    const { type, targetUser, isPromoting } = confirmModal
    if (!targetUser) return
    const token = localStorage.getItem('auth_token')
    if (!token) return

    setConfirmModal(prev => ({ ...prev, loading: true }))

    try {
      if (type === 'delete') {
        const res = await fetch(`${API_URL}/admin/users/${targetUser.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errData.error || `Erreur HTTP ${res.status}`)
        }

        const data = (await res.json()) as { message?: string }
        setActionToast(data.message || `Le compte "${targetUser.username}" a été supprimé.`)
        setUsers(prev => prev.filter(u => u.id !== targetUser.id))
        setStats(prev => (prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : null))
      } else if (type === 'reset-stats') {
        const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/reset-stats`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errData.error || `Erreur HTTP ${res.status}`)
        }

        const data = (await res.json()) as { message?: string; user?: Partial<AdminUser> }
        setActionToast(data.message || `Statistiques de "${targetUser.username}" remises à zéro.`)
        setUsers(prev =>
          prev.map(u =>
            u.id === targetUser.id
              ? {
                  ...u,
                  level: 1,
                  xp: 0,
                  totalPoints: 0,
                  gamesPlayed: 0,
                  gamesWon: 0,
                }
              : u
          )
        )
      } else if (type === 'toggle-admin') {
        const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/role`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAdmin: Boolean(isPromoting) }),
        })

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errData.error || `Erreur HTTP ${res.status}`)
        }

        const data = (await res.json()) as { message?: string; user?: { isAdmin: boolean } }
        setActionToast(
          data.message ||
            (isPromoting
              ? `Rôle Administrateur accordé à "${targetUser.username}".`
              : `Rôle Administrateur retiré à "${targetUser.username}".`)
        )
        setUsers(prev =>
          prev.map(u =>
            u.id === targetUser.id
              ? {
                  ...u,
                  isAdmin: Boolean(isPromoting),
                }
              : u
          )
        )
      }

      setConfirmModal({
        isOpen: false,
        type: 'delete',
        targetUser: null,
        loading: false,
      })
    } catch (err) {
      alert(`Erreur : ${String(err)}`)
      setConfirmModal(prev => ({ ...prev, loading: false }))
    }
  }

  /* ── Filtered user list ───────────────────────────────────────────── */
  const displayedUsers = useMemo(() => {
    return users
  }, [users])

  /* ── Access Denied Render ─────────────────────────────────────────── */
  if (authChecked && !isAdmin) {
    return (
      <main className="admin-page">
        <header className="admin-header">
          <button
            className="admin-back-btn"
            onClick={() => navigate('/')}
            title="Retour au salon principal"
          >
            ← Retour au Lobby
          </button>
          <div className="admin-header-title-row">
            <div className="admin-header-icon">🔒</div>
            <div>
              <h1 className="admin-header-title">Espace Administration</h1>
              <p className="admin-header-sub">Gestion des comptes et utilisateurs</p>
            </div>
          </div>
        </header>

        <div className="admin-content" style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
          <div
            style={{
              background: 'var(--color-bg-card)',
              padding: '40px 32px',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--color-text-primary)' }}>
              Accès Administrateur Requis
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Cet espace est strictement réservé à la gestion des utilisateurs, des statistiques et des rôles d'administration. Veuillez vous connecter avec un compte administrateur habilité.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px var(--color-accent-glow)',
                }}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
              >
                Retour aux arènes
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  /* ── Main Admin Render ────────────────────────────────────────────── */
  return (
    <main className="admin-page">
      {/* Top Header */}
      <header className="admin-header">
        <button
          className="admin-back-btn"
          onClick={() => navigate('/')}
          title="Retour au salon principal"
        >
          ← Retour au Lobby
        </button>

        <div className="admin-header-title-row">
          <div className="admin-header-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            👥
          </div>
          <div>
            <h1 className="admin-header-title">Gestion des Utilisateurs</h1>
            <p className="admin-header-sub">
              Consultez les comptes joueurs, réinitialisez les statistiques ou attribuez les privilèges administrateur
            </p>
          </div>
        </div>

        {/* ── Primary Page Navigation Tabs (Questions vs Utilisateurs) ── */}
        <div className="admin-page-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="admin-page-tab-btn"
            onClick={() => {
              soundManager.playClick()
              navigate('/admin')
            }}
          >
            <span className="admin-page-tab-icon">❓</span>
            <span className="admin-page-tab-label">Questions</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="admin-page-tab-btn admin-page-tab-btn--active"
            onClick={() => {
              soundManager.playClick()
              navigate('/admin/users')
            }}
          >
            <span className="admin-page-tab-icon">👥</span>
            <span className="admin-page-tab-label">Utilisateurs</span>
            {stats && <span className="admin-page-tab-badge">{stats.totalUsers}</span>}
          </button>
        </div>
      </header>

      <div className="admin-content">
        {/* ── Global KPI Stats Grid ── */}
        {stats && (
          <div className="admin-users-stats-grid">
            <div className="admin-users-stat-card">
              <div className="admin-stat-icon admin-stat-icon--users">👥</div>
              <div className="admin-stat-data">
                <span className="admin-stat-value">{stats.totalUsers}</span>
                <span className="admin-stat-label">Comptes Inscrits</span>
              </div>
            </div>

            <div className="admin-users-stat-card">
              <div className="admin-stat-icon admin-stat-icon--admins">🛡️</div>
              <div className="admin-stat-data">
                <span className="admin-stat-value">{stats.totalAdmins}</span>
                <span className="admin-stat-label">Administrateurs</span>
              </div>
            </div>

            <div className="admin-users-stat-card">
              <div className="admin-stat-icon admin-stat-icon--games">🎮</div>
              <div className="admin-stat-data">
                <span className="admin-stat-value">{stats.totalGamesPlayed.toLocaleString()}</span>
                <span className="admin-stat-label">Parties Jouées</span>
              </div>
            </div>

            <div className="admin-users-stat-card">
              <div className="admin-stat-icon admin-stat-icon--xp">⭐</div>
              <div className="admin-stat-data">
                <span className="admin-stat-value">{stats.totalXp.toLocaleString()}</span>
                <span className="admin-stat-label">XP Communautaire</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Toolbar: Search, Filters, Sorting, Refresh ── */}
        <div className="admin-users-toolbar">
          <div className="admin-users-search-box">
            <span className="admin-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher par pseudo ou nom affiché…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-users-search-input"
            />
            {search && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setSearch('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="admin-users-filters-row">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value as any)}
              className="admin-users-select"
            >
              <option value="all">Tous les rôles</option>
              <option value="admin">🛡️ Admins uniquement</option>
              <option value="player">🎮 Joueurs uniquement</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="admin-users-select"
            >
              <option value="createdAt">Date d'inscription</option>
              <option value="xp">Niveau & XP</option>
              <option value="gamesPlayed">Parties jouées</option>
              <option value="gamesWon">Victoires</option>
              <option value="username">Pseudo (A-Z)</option>
            </select>

            <button
              type="button"
              className="admin-users-btn-refresh"
              onClick={() => {
                soundManager.playClick()
                setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
              }}
              title="Inverser l'ordre du tri"
            >
              {sortOrder === 'desc' ? '⬇ Décroissant' : '⬆ Croissant'}
            </button>

            <button
              type="button"
              className="admin-users-btn-refresh"
              onClick={() => {
                soundManager.playClick()
                fetchUsers()
              }}
              disabled={loading}
              title="Rafraîchir la liste des utilisateurs"
            >
              {loading ? '…' : '🔄 Actualiser'}
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="admin-suspended-error" style={{ marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Users Table Card ── */}
        <div className="admin-users-card">
          {loading ? (
            <div className="admin-suspended-loading">
              <p>Chargement des comptes utilisateurs…</p>
            </div>
          ) : displayedUsers.length === 0 ? (
            <div className="admin-users-empty">
              <div className="admin-empty-icon">🔍</div>
              <h3 className="admin-empty-title">Aucun utilisateur trouvé</h3>
              <p className="admin-empty-desc">
                Aucun compte ne correspond à vos critères de recherche actuels.
              </p>
            </div>
          ) : (
            <div className="admin-users-table-wrapper">
              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Progression</th>
                    <th>Statistiques de Jeu</th>
                    <th style={{ textAlign: 'right' }}>Actions d'Administration</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map(user => {
                    const isSelf = user.id === currentUserId
                    const winRate =
                      user.gamesPlayed > 0
                        ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
                        : 0

                    return (
                      <tr key={user.id} id={`user-row-${user.id}`}>
                        {/* Profile & Identity */}
                        <td>
                          <div className="admin-user-cell-profile">
                            <div
                              className={`admin-user-avatar ${
                                user.isAdmin ? 'admin-user-avatar--admin' : ''
                              }`}
                            >
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="admin-user-meta">
                              <div className="admin-user-username-row">
                                <span className="admin-user-username">
                                  {user.displayName || user.username}
                                </span>
                                {isSelf && (
                                  <span className="admin-user-self-tag">Vous</span>
                                )}
                              </div>
                              <span className="admin-user-date">
                                @{user.username} • Inscrit le{' '}
                                {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          {user.isAdmin ? (
                            <span className="admin-role-badge admin-role-badge--admin">
                              🛡️ Administrateur
                            </span>
                          ) : (
                            <span className="admin-role-badge admin-role-badge--player">
                              🎮 Joueur
                            </span>
                          )}
                        </td>

                        {/* Progression (Level & XP) */}
                        <td>
                          <div className="admin-progression-cell">
                            <span className="admin-level-badge">
                              Niveau {user.level || Math.floor((user.xp || 0) / 100) + 1}
                            </span>
                            <span className="admin-xp-text">
                              {user.xp.toLocaleString()} XP • {user.totalPoints.toLocaleString()} pts
                            </span>
                          </div>
                        </td>

                        {/* Game stats */}
                        <td>
                          <div className="admin-stats-pills">
                            <span className="admin-stat-pill" title="Nombre total de parties jouées">
                              🎲 {user.gamesPlayed} partie{user.gamesPlayed > 1 ? 's' : ''}
                            </span>
                            <span className="admin-stat-pill admin-stat-pill--won" title="Victoires remportées">
                              🏆 {user.gamesWon} ({winRate}%)
                            </span>
                            {user._count?.templates ? (
                              <span className="admin-stat-pill" title="Modèles de jeu créés">
                                📋 {user._count.templates} modèle{user._count.templates > 1 ? 's' : ''}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td>
                          <div className="admin-user-actions">
                            {/* Role Grant / Revoke */}
                            {user.isAdmin ? (
                              <button
                                type="button"
                                className="admin-user-btn admin-user-btn--demote"
                                onClick={() => handleOpenToggleAdmin(user)}
                                disabled={isSelf}
                                title={
                                  isSelf
                                    ? 'Vous ne pouvez pas vous rétrograder vous-même'
                                    : 'Rétrograder au rôle Joueur'
                                }
                              >
                                🔻 Rétrograder
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="admin-user-btn admin-user-btn--promote"
                                onClick={() => handleOpenToggleAdmin(user)}
                                title="Accorder les privilèges Administrateur"
                              >
                                🛡️ Rôle Admin
                              </button>
                            )}

                            {/* Reset Stats */}
                            <button
                              type="button"
                              className="admin-user-btn admin-user-btn--reset"
                              onClick={() => handleOpenResetStats(user)}
                              title="Remettre le niveau, l'XP et les scores à zéro"
                            >
                              🔄 Réinitialiser
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              className="admin-user-btn admin-user-btn--delete"
                              onClick={() => handleOpenDelete(user)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? 'Vous ne pouvez pas supprimer votre propre compte'
                                  : 'Supprimer définitivement ce compte'
                              }
                            >
                              🗑️ Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── In-App Confirmation Modal ── */}
      {confirmModal.isOpen && confirmModal.targetUser && (
        <div className="admin-confirm-overlay" onClick={handleCloseModal}>
          <div className="admin-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-confirm-header">
              <div
                className={`admin-confirm-icon-box ${
                  confirmModal.type === 'delete'
                    ? 'admin-confirm-icon-box--danger'
                    : confirmModal.type === 'reset-stats'
                    ? 'admin-confirm-icon-box--warning'
                    : 'admin-confirm-icon-box--role'
                }`}
              >
                {confirmModal.type === 'delete'
                  ? '🗑️'
                  : confirmModal.type === 'reset-stats'
                  ? '🔄'
                  : confirmModal.isPromoting
                  ? '🛡️'
                  : '🔻'}
              </div>

              <div className="admin-confirm-title-group">
                <h3 className="admin-confirm-title">
                  {confirmModal.type === 'delete' && 'Supprimer le compte'}
                  {confirmModal.type === 'reset-stats' && 'Réinitialiser les statistiques'}
                  {confirmModal.type === 'toggle-admin' &&
                    (confirmModal.isPromoting
                      ? 'Accorder le rôle Administrateur'
                      : 'Retirer le rôle Administrateur')}
                </h3>
                <p className="admin-confirm-subtitle">
                  {confirmModal.type === 'delete' &&
                    'Voulez-vous vraiment supprimer définitivement ce compte utilisateur ? Cette action est irréversible.'}
                  {confirmModal.type === 'reset-stats' &&
                    "Remise à zéro de l'expérience, du niveau et de l'historique de jeu."}
                  {confirmModal.type === 'toggle-admin' &&
                    (confirmModal.isPromoting
                      ? "Cet utilisateur aura accès complet à la modération et l'administration."
                      : "Cet utilisateur redeviendra un joueur standard sans droits d'administration.")}
                </p>
              </div>
            </div>

            {/* Target User Preview Card */}
            <div className="admin-confirm-user-preview">
              <div
                className={`admin-user-avatar ${
                  confirmModal.targetUser.isAdmin ? 'admin-user-avatar--admin' : ''
                }`}
              >
                {confirmModal.targetUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="admin-user-meta">
                <span className="admin-user-username">
                  {confirmModal.targetUser.displayName || confirmModal.targetUser.username}
                </span>
                <span className="admin-user-date">
                  @{confirmModal.targetUser.username} • Niveau {confirmModal.targetUser.level} •{' '}
                  {confirmModal.targetUser.xp} XP • {confirmModal.targetUser.gamesPlayed} parties
                </span>
              </div>
            </div>

            {/* Action Warnings */}
            {confirmModal.type === 'delete' && (
              <div className="admin-confirm-warning-box">
                ⚠️ <strong>Avertissement :</strong> La suppression de ce compte effacera
                définitivement son historique, ses succès débloqués, ses modèles de salon et ses
                sessions actives.
              </div>
            )}

            {confirmModal.type === 'reset-stats' && (
              <div className="admin-confirm-warning-box">
                ℹ️ Le compte sera conservé mais son niveau repassera au <strong>Niveau 1</strong> (0
                XP), son compteur de victoires et parties sera remis à 0.
              </div>
            )}

            {/* Actions */}
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-confirm-btn-cancel"
                onClick={handleCloseModal}
                disabled={confirmModal.loading}
              >
                Annuler
              </button>

              <button
                type="button"
                className={`admin-confirm-btn-action ${
                  confirmModal.type === 'delete'
                    ? 'admin-confirm-btn-action--danger'
                    : confirmModal.type === 'reset-stats'
                    ? 'admin-confirm-btn-action--warning'
                    : 'admin-confirm-btn-action--role'
                }`}
                onClick={handleExecuteConfirm}
                disabled={confirmModal.loading}
              >
                {confirmModal.loading
                  ? 'Traitement en cours…'
                  : confirmModal.type === 'delete'
                  ? '🗑️ Supprimer définitivement'
                  : confirmModal.type === 'reset-stats'
                  ? '🔄 Confirmer la réinitialisation'
                  : confirmModal.isPromoting
                  ? '🛡️ Accorder les droits Admin'
                  : '🔻 Retirer les droits Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {actionToast && (
        <div className="admin-action-toast fade-in">
          <span>✨</span>
          <span>{actionToast}</span>
        </div>
      )}
    </main>
  )
}
