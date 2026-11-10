import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconUser, IconTrophy, IconStar, IconGamepad, IconLogOut, IconChevronLeft,
  IconTemplate, IconShare, IconCopy, IconCheck, IconTrash, IconGlobe, IconLock,
  IconClock, IconZap, IconInfinity, IconAlertCircle
} from '../../components/Icons'
import { API_URL } from '../../utils/config'
import {
  fetchMyTemplates, deleteTemplate, updateTemplate, cloneTemplate
} from '../../utils/templateApi'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../types'
import type { GameTemplate } from '../../types'
import './Profile.css'

interface UserProfile {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  level: number
  xp: number
  totalPoints: number
  gamesPlayed: number
  gamesWon: number
  createdAt: string
  recentAchievements: any[]
}

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'templates'>('overview')

  // Templates state
  const [templates, setTemplates] = useState<GameTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [templateMsg, setTemplateMsg] = useState('')
  const [templateErr, setTemplateErr] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [inputImportCode, setInputImportCode] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const token = localStorage.getItem('auth_token')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    // Fetch the full profile from the /auth/me endpoint
    fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch profile')
        return res.json()
      })
      .then(data => {
        if (data.error) throw new Error(data.error)
        setProfile(data)
      })
      .catch(err => {
        setError('Impossible de charger le profil.')
        console.error(err)
      })
      .finally(() => {
        setIsLoading(false)
      })

    // Fetch user templates
    loadUserTemplates(token)
  }, [navigate, token])

  const loadUserTemplates = async (authToken: string) => {
    setIsLoadingTemplates(true)
    try {
      const data = await fetchMyTemplates(authToken)
      setTemplates(data)
    } catch (err) {
      console.error('Failed to load templates:', err)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(identifier)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const handleTogglePublic = async (tpl: GameTemplate) => {
    if (!token) return
    const nextPublic = !tpl.isPublic
    try {
      const updated = await updateTemplate(token, tpl.id, { isPublic: nextPublic })
      setTemplates(prev => prev.map(t => (t.id === tpl.id ? updated : t)))
      setTemplateMsg(`Modèle "${tpl.name}" est désormais ${nextPublic ? 'public' : 'privé'}.`)
      setTimeout(() => setTemplateMsg(''), 3000)
    } catch (err: any) {
      setTemplateErr(err.message || 'Erreur lors du changement de visibilité.')
      setTimeout(() => setTemplateErr(''), 3000)
    }
  }

  const handleDeleteTemplate = async (tpl: GameTemplate) => {
    if (!token) return
    if (!window.confirm(`Supprimer définitivement le modèle "${tpl.name}" ?`)) return
    try {
      await deleteTemplate(token, tpl.id)
      setTemplates(prev => prev.filter(t => t.id !== tpl.id))
      setTemplateMsg(`Modèle "${tpl.name}" supprimé.`)
      setTimeout(() => setTemplateMsg(''), 3000)
    } catch (err: any) {
      setTemplateErr(err.message || 'Erreur lors de la suppression.')
      setTimeout(() => setTemplateErr(''), 3000)
    }
  }

  const handleImportByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    const code = inputImportCode.trim().toUpperCase()
    if (!code) return
    setIsImporting(true)
    setTemplateErr('')
    try {
      const cloned = await cloneTemplate(token, code)
      setTemplates(prev => [cloned, ...prev])
      setInputImportCode('')
      setTemplateMsg(`Modèle "${cloned.name}" ajouté avec succès à vos modèles !`)
      setTimeout(() => setTemplateMsg(''), 3500)
    } catch (err: any) {
      setTemplateErr(err.message || 'Code de modèle invalide ou introuvable.')
      setTimeout(() => setTemplateErr(''), 3500)
    } finally {
      setIsImporting(false)
    }
  }

  const handleLogout = () => {
    if (token) {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(console.error)
    }
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Chargement...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="btn-back">
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  const xpForNextLevel = profile.level * 1000
  const xpProgress = Math.min(100, Math.round((profile.xp / xpForNextLevel) * 100))

  return (
    <div className="profile-page">
      <div className="profile-bg-glow profile-bg-glow--1" />
      <div className="profile-bg-glow profile-bg-glow--2" />

      <header className="profile-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          <IconChevronLeft /> Retour
        </button>
        <button className="btn-logout" onClick={handleLogout}>
          <IconLogOut /> Déconnexion
        </button>
      </header>

      <main className="profile-main">
        {/* User Card */}
        <section className="profile-card">
          <div className="profile-avatar-container">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                <IconUser />
              </div>
            )}
            <div className="profile-level-badge">Lvl {profile.level}</div>
          </div>
          
          <h1 className="profile-username">{profile.username}</h1>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <p className="profile-join-date">Membre depuis {new Date(profile.createdAt).toLocaleDateString()}</p>

          <div className="profile-xp-bar-container">
            <div className="profile-xp-bar-header">
              <span>XP: {profile.xp}</span>
              <span>Prochain Niveau: {xpForNextLevel}</span>
            </div>
            <div className="profile-xp-bar">
              <div className="profile-xp-progress" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
        </section>

        {/* Profile Tabs Navigation */}
        <div className="profile-sub-tabs">
          <button
            className={`profile-sub-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <IconGamepad /> Vue d'ensemble & Stats
          </button>
          <button
            className={`profile-sub-tab ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <IconTemplate /> Mes Modèles de Partie ({templates.length})
          </button>
        </div>

        {/* ─── TAB 1: OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <section className="profile-stats fade-in">
              <div className="stat-card">
                <div className="stat-icon stat-icon--blue"><IconGamepad /></div>
                <div className="stat-info">
                  <span className="stat-value">{profile.gamesPlayed}</span>
                  <span className="stat-label">Parties Jouées</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon--green"><IconTrophy /></div>
                <div className="stat-info">
                  <span className="stat-value">{profile.gamesWon}</span>
                  <span className="stat-label">Victoires</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon stat-icon--yellow"><IconStar /></div>
                <div className="stat-info">
                  <span className="stat-value">{profile.totalPoints}</span>
                  <span className="stat-label">Points Totaux</span>
                </div>
              </div>
            </section>

            {/* Recent Achievements */}
            <section className="profile-achievements fade-in">
              <h2 className="section-title">Derniers Succès</h2>
              {profile.recentAchievements && profile.recentAchievements.length > 0 ? (
                <div className="achievements-list">
                  {profile.recentAchievements.map((ach, i) => (
                    <div key={i} className="achievement-item">
                      <span className="achievement-icon">{ach.icon || '🏆'}</span>
                      <div className="achievement-details">
                        <span className="achievement-name">{ach.name}</span>
                        <span className="achievement-date">{new Date(ach.unlockedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-achievements">
                  <p>Aucun succès débloqué pour le moment. Jouez pour en obtenir !</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* ─── TAB 2: TEMPLATES MANAGEMENT ─── */}
        {activeTab === 'templates' && (
          <section className="profile-templates fade-in">
            {/* Alerts */}
            {templateMsg && (
              <div className="template-alert template-alert--success fade-in" style={{ margin: '0 0 16px 0' }}>
                <IconCheck /> {templateMsg}
              </div>
            )}
            {templateErr && (
              <div className="template-alert template-alert--error fade-in" style={{ margin: '0 0 16px 0' }}>
                <IconAlertCircle /> {templateErr}
              </div>
            )}

            {/* Import by code bar */}
            <div className="profile-import-box">
              <h3 className="profile-import-title"><IconShare /> Importer un modèle avec un code de partage</h3>
              <form className="profile-import-form" onSubmit={handleImportByCode}>
                <input
                  type="text"
                  placeholder="Ex: TMPL-7X2A"
                  value={inputImportCode}
                  onChange={e => setInputImportCode(e.target.value.toUpperCase())}
                  className="modal-input profile-import-input"
                  maxLength={12}
                />
                <button type="submit" className="btn-create" disabled={isImporting || !inputImportCode.trim()}>
                  {isImporting ? 'Import...' : 'Ajouter à mes modèles'}
                </button>
              </form>
            </div>

            {/* Templates List */}
            {isLoadingTemplates ? (
              <div className="template-loading">Chargement de vos modèles...</div>
            ) : templates.length === 0 ? (
              <div className="template-empty-state">
                <IconTemplate />
                <h3>Aucun modèle créé</h3>
                <p>
                  Vous pouvez enregistrer un modèle lors de la création d'une arène ou depuis l'arène de jeu.
                </p>
                <button className="btn-create" onClick={() => navigate('/')} style={{ marginTop: 14 }}>
                  Aller au salon de jeu
                </button>
              </div>
            ) : (
              <div className="template-cards-grid">
                {templates.map(tpl => (
                  <div key={tpl.id} className="template-item-card">
                    <div className="template-item-header">
                      <div className="template-item-title-box">
                        <h4 className="template-item-name">{tpl.name}</h4>
                        <button
                          type="button"
                          className={`template-badge ${tpl.isPublic ? 'badge--public' : 'badge--private'}`}
                          onClick={() => handleTogglePublic(tpl)}
                          title="Cliquez pour changer la visibilité (Public / Privé)"
                          style={{ cursor: 'pointer', border: 'none' }}
                        >
                          {tpl.isPublic ? <><IconGlobe /> Public (visible)</> : <><IconLock /> Privé</>}
                        </button>
                      </div>

                      <div
                        className="template-item-code-badge"
                        onClick={() => handleCopy(tpl.shareCode, `code-${tpl.id}`)}
                        title="Cliquer pour copier le code"
                      >
                        {copiedCode === `code-${tpl.id}` ? <><IconCheck /> Copié !</> : <><IconCopy /> {tpl.shareCode}</>}
                      </div>
                    </div>

                    {tpl.description && <p className="template-item-desc">{tpl.description}</p>}

                    {/* Settings Pills Preview */}
                    <div className="template-settings-pills">
                      <span className="setting-pill"><IconClock /> {tpl.settings.timePerRound ?? 20}s</span>
                      <span className="setting-pill">
                        {tpl.settings.infiniteRounds ? <><IconInfinity /> Infini</> : <><IconZap /> {tpl.settings.roundCount ?? 10} manches</>}
                      </span>
                      <span className="setting-pill"><IconTrophy /> {tpl.settings.maxPoints ?? 1000} pts</span>
                      <span className="setting-pill badge--usage">🔥 {tpl.usageCount ?? 0} utilisations</span>
                    </div>

                    {/* Categories Preview */}
                    <div className="template-cats-preview">
                      {(tpl.settings.categories ?? []).map(cat => (
                        <span key={cat} className="template-cat-tag">
                          {CATEGORY_ICONS[cat] || '🏷️'} {CATEGORY_LABELS[cat] || cat}
                        </span>
                      ))}
                    </div>

                    {/* Card Actions */}
                    <div className="template-card-actions">
                      <button
                        type="button"
                        className="btn-tpl-apply"
                        onClick={() => navigate(`/?template=${tpl.shareCode}`)}
                        title="Créer une arène avec ce modèle"
                      >
                        <IconZap /> Créer une arène
                      </button>
                      <button
                        type="button"
                        className="btn-tpl-action"
                        onClick={() => handleCopy(`${window.location.origin}/?template=${tpl.shareCode}`, `link-${tpl.id}`)}
                        title="Copier le lien direct de partage"
                      >
                        {copiedCode === `link-${tpl.id}` ? <><IconCheck /> Lien copié !</> : <><IconShare /> Lien direct</>}
                      </button>
                      <button
                        type="button"
                        className="btn-tpl-action btn-tpl-danger"
                        onClick={() => handleDeleteTemplate(tpl)}
                        title="Supprimer ce modèle"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
