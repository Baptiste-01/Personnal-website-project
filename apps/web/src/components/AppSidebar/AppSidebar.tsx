import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  IconGamepad,
  IconDice,
  IconHelpCircle,
  IconUser,
  IconChevronDoubleLeft,
  IconChevronDoubleRight,
  IconLogOut,
  IconLogin,
  IconX,
} from '../Icons'
import AudioThemeControls from '../AudioThemeControls'
import { soundManager } from '../../utils/sound'
import { API_URL } from '../../utils/config'
import './AppSidebar.css'

interface AppSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

export default function AppSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const [authUser, setAuthUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [suspendedCount, setSuspendedCount] = useState<number>(0)

  // Load auth user from localStorage & listen for changes
  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('auth_user')
      const token = localStorage.getItem('auth_token')
      if (userStr && token) {
        try {
          setAuthUser(JSON.parse(userStr))
          setIsConnected(true)
        } catch {
          setAuthUser(null)
          setIsConnected(false)
        }
      } else {
        setAuthUser(null)
        setIsConnected(false)
      }
    }

    checkAuth()
    window.addEventListener('storage', checkAuth)
    return () => window.removeEventListener('storage', checkAuth)
  }, [location.pathname])

  // Fetch count of suspended/muted questions for admin notification badge
  useEffect(() => {
    if (!isConnected || !authUser?.isAdmin) {
      setSuspendedCount(0)
      return
    }

    let active = true
    fetch(`${API_URL}/admin/questions/muted`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (active && data && typeof data.count === 'number') {
          setSuspendedCount(data.count)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [isConnected, authUser?.isAdmin, location.pathname])

  const handleLogout = () => {
    soundManager.playClick()
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setAuthUser(null)
    setIsConnected(false)
    navigate('/')
  }

  const navItems = [
    {
      to: '/',
      label: 'Arènes & Salons',
      shortLabel: 'Arènes',
      subtitle: 'Parties multijoueurs',
      icon: <IconGamepad />,
      badge: 'En direct',
      badgeClass: 'as-badge--live',
    },
    {
      to: '/games',
      label: 'Catalogue de Jeux',
      shortLabel: 'Jeux',
      subtitle: 'FlashGuess & À venir',
      icon: <IconDice />,
      badge: 'Nouveau',
      badgeClass: 'as-badge--new',
    },
    {
      to: '/admin',
      label: isConnected && authUser?.isAdmin ? 'Administration' : 'Questions',
      shortLabel: isConnected && authUser?.isAdmin ? 'Admin' : 'Questions',
      subtitle:
        isConnected && authUser?.isAdmin && suspendedCount > 0
          ? `${suspendedCount} suspendue${suspendedCount > 1 ? 's' : ''}`
          : isConnected && authUser?.isAdmin
          ? 'Questions & Utilisateurs'
          : 'Banque & Modération',
      icon: <IconHelpCircle />,
      badge:
        isConnected && authUser?.isAdmin
          ? suspendedCount > 0
            ? `⚠️ ${suspendedCount}`
            : 'Admin'
          : 'Banque',
      badgeClass:
        isConnected && authUser?.isAdmin
          ? suspendedCount > 0
            ? 'as-badge--warning'
            : 'as-badge--admin'
          : 'as-badge--muted',
    },
    {
      to: isConnected ? '/profile' : '/login',
      label: isConnected ? 'Mon Profil' : 'Utilisateur',
      shortLabel: 'Profil',
      subtitle: isConnected ? `${authUser?.username || 'Joueur'}` : 'Se connecter',
      icon: <IconUser />,
      badge: isConnected ? `Niv. ${Math.floor((authUser?.xp || 0) / 100) + 1}` : undefined,
      badgeClass: 'as-badge--xp',
    },
  ]

  const userInitial = authUser?.username ? authUser.username.charAt(0).toUpperCase() : '?'
  const userLevel = Math.floor((authUser?.xp || 0) / 100) + 1

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="as-backdrop"
          onClick={() => {
            soundManager.playClick()
            onCloseMobile()
          }}
          aria-hidden="true"
        />
      )}

      <aside
        className={`as-sidebar ${collapsed ? 'as-sidebar--collapsed' : 'as-sidebar--expanded'} ${
          mobileOpen ? 'as-sidebar--mobile-open' : ''
        }`}
        id="app-sidebar"
        aria-label="Navigation principale"
      >
        {/* ─── Header / Brand ─── */}
        <div className="as-header">
          <NavLink
            to="/"
            className="as-brand"
            onClick={() => {
              soundManager.playClick()
              if (mobileOpen) onCloseMobile()
            }}
            title="Smik Party - Accueil"
          >
            <div className="as-brand-icon">
              <IconGamepad />
            </div>
            {!collapsed && (
              <div className="as-brand-text">
                <span className="as-brand-title">
                  Smik <span className="as-brand-accent">Party</span>
                </span>
                <span className="as-brand-tag">v2.0 Hub</span>
              </div>
            )}
          </NavLink>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            className="as-toggle-btn as-toggle-btn--desktop"
            onClick={() => {
              soundManager.playClick()
              onToggleCollapse()
            }}
            title={collapsed ? 'Déplier le menu latéral' : 'Replier le menu latéral'}
            aria-label={collapsed ? 'Déplier le menu' : 'Replier le menu'}
          >
            {collapsed ? <IconChevronDoubleRight /> : <IconChevronDoubleLeft />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            className="as-toggle-btn as-toggle-btn--mobile"
            onClick={() => {
              soundManager.playClick()
              onCloseMobile()
            }}
            aria-label="Fermer le menu"
          >
            <IconX />
          </button>
        </div>

        {/* ─── Navigation Section ─── */}
        <nav className="as-nav">
          <div className="as-nav-section-title">
            {!collapsed ? <span>Navigation</span> : <span className="as-nav-dot">•</span>}
          </div>

          <ul className="as-nav-list">
            {navItems.map(item => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to)

              return (
                <li key={item.to} className="as-nav-item">
                  <NavLink
                    to={item.to}
                    className={`as-nav-link ${isActive ? 'as-nav-link--active' : ''}`}
                    onClick={() => {
                      soundManager.playClick()
                      if (mobileOpen) onCloseMobile()
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="as-nav-icon">{item.icon}</span>
                    {!collapsed && (
                      <div className="as-nav-info">
                        <span className="as-nav-label">{item.label}</span>
                        <span className="as-nav-sub">{item.subtitle}</span>
                      </div>
                    )}
                    {!collapsed && item.badge && (
                      <span className={`as-badge ${item.badgeClass || ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ─── Audio & Ambient Controls ─── */}
        <div className="as-audio-zone">
          <div className="as-audio-wrapper">
            <AudioThemeControls compact={collapsed} />
          </div>
        </div>

        {/* ─── Footer User Card ─── */}
        <div className="as-footer">
          {isConnected && authUser ? (
            <div className={`as-user-card ${collapsed ? 'as-user-card--collapsed' : ''}`}>
              <div
                className="as-user-avatar"
                onClick={() => {
                  soundManager.playClick()
                  navigate('/profile')
                  if (mobileOpen) onCloseMobile()
                }}
                title={`Profil de ${authUser.username} (Niveau ${userLevel})`}
              >
                <span>{userInitial}</span>
                {authUser.isAdmin && <span className="as-user-crown">👑</span>}
              </div>

              {!collapsed && (
                <div
                  className="as-user-meta"
                  onClick={() => {
                    soundManager.playClick()
                    navigate('/profile')
                    if (mobileOpen) onCloseMobile()
                  }}
                >
                  <div className="as-user-name-row">
                    <span className="as-user-name">{authUser.username}</span>
                    {authUser.isAdmin && <span className="as-role-badge">Admin</span>}
                  </div>
                  <span className="as-user-xp">
                    Niveau {userLevel} • {authUser.xp || 0} XP
                  </span>
                </div>
              )}

              {!collapsed && (
                <button
                  type="button"
                  className="as-logout-btn"
                  onClick={handleLogout}
                  title="Se déconnecter"
                  aria-label="Déconnexion"
                >
                  <IconLogOut />
                </button>
              )}
            </div>
          ) : (
            <div className={`as-guest-card ${collapsed ? 'as-guest-card--collapsed' : ''}`}>
              {!collapsed ? (
                <button
                  type="button"
                  className="as-login-btn"
                  onClick={() => {
                    soundManager.playClick()
                    navigate('/login')
                    if (mobileOpen) onCloseMobile()
                  }}
                >
                  <IconLogin />
                  <span>Se connecter</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="as-login-icon-btn"
                  onClick={() => {
                    soundManager.playClick()
                    navigate('/login')
                    if (mobileOpen) onCloseMobile()
                  }}
                  title="Se connecter"
                  aria-label="Se connecter"
                >
                  <IconLogin />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
