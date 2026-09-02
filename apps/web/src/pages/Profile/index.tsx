import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconUser, IconTrophy, IconStar, IconGamepad, IconLogOut, IconChevronLeft } from '../../components/Icons'
import type { Achievement } from '../../types'
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
  recentAchievements: Achievement[]
}

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      navigate('/login')
      return
    }

    // Fetch the full profile from the /auth/me endpoint
    fetch('/auth/me', {
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
  }, [navigate])

  const handleLogout = () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      fetch('/auth/logout', {
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

  // Calculate XP progress (arbitrary logic for visual effect)
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

        {/* Stats Grid */}
        <section className="profile-stats">
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
        <section className="profile-achievements">
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
      </main>
    </div>
  )
}
