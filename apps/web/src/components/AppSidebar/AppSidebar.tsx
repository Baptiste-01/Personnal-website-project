import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  IconGamepad,
  IconZap,
  IconDice,
  IconHelpCircle,
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

  // Navigation Items — sleek, single-line items with concise labels and tooltips
  const navItems = [
    {
      to: '/',
      label: 'Accueil',
      shortLabel: 'Accueil',
      tooltip: 'Accueil — Présentation de Smik Party & Hub des Jeux',
      icon: <IconGamepad />,
      badge: 'Hub',
      badgeClass: 'as-badge--new',
    },
    {
      to: '/speedsmik',
      label: 'SpeedSmik',
      shortLabel: 'SpeedSmik',
      tooltip: 'SpeedSmik (Clone JKLM) — Arènes & Salons multijoueurs en direct',
      icon: <IconZap />,
      badge: 'En direct',
      badgeClass: 'as-badge--live',
    },
    {
      to: '/games',
      label: 'Jeux',
      shortLabel: 'Jeux',
      tooltip: 'Catalogue complet des jeux & votes de la communauté',
      icon: <IconDice />,
      badge: '5 Jeux',
      badgeClass: 'as-badge--muted',
    },
    {
      to: '/admin',
      label: isConnected && authUser?.isAdmin ? 'Admin' : 'Questions',
      shortLabel: isConnected && authUser?.isAdmin ? 'Admin' : 'Questions',
      tooltip:
        isConnected && authUser?.isAdmin
          ? suspendedCount > 0
            ? `Administration (${suspendedCount} question${suspendedCount > 1 ? 's' : ''} suspendue${suspendedCount > 1 ? 's' : ''})`
            : 'Administration — Questions & Modération'
          : 'Banque de questions & Modération',
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
          {!collapsed ? (
            <div className="as-header-content">
              {/* Toggle Brand Icon next to Smik Party */}
              <button
                type="button"
                className="as-brand-icon as-brand-icon--toggle"
                onClick={() => {
                  soundManager.playClick()
                  onToggleCollapse()
                }}
                title="Replier le menu latéral"
                aria-label="Replier le menu latéral"
              >
                <IconGamepad />
              </button>

              {/* Brand title navigating to Home */}
              <NavLink
                to="/"
                className="as-brand-text"
                onClick={() => {
                  soundManager.playClick()
                  if (mobileOpen) onCloseMobile()
                }}
                title="Smik Party - Accueil"
              >
                <span className="as-brand-title">
                  Smik <span className="as-brand-accent">Party</span>
                </span>
                <span className="as-brand-tag">v2.0 Hub</span>
              </NavLink>

              {/* Desktop Collapse Toggle */}
              <button
                type="button"
                className="as-toggle-btn as-toggle-btn--desktop"
                onClick={() => {
                  soundManager.playClick()
                  onToggleCollapse()
                }}
                title="Replier le menu latéral"
                aria-label="Replier le menu latéral"
              >
                <IconChevronDoubleLeft />
              </button>
            </div>
          ) : (
            <div className="as-header-collapsed">
              {/* Centered Icon next to Smik Party: reduces and expands the sidebar */}
              <button
                type="button"
                className="as-brand-icon as-brand-icon--collapsed as-brand-icon--toggle"
                onClick={() => {
                  soundManager.playClick()
                  onToggleCollapse()
                }}
                title="Déplier le menu latéral (Smik Party)"
                aria-label="Déplier le menu latéral"
              >
                <IconGamepad />
                <span className="as-brand-expand-hint" aria-hidden="true">
                  <IconChevronDoubleRight />
                </span>
              </button>
            </div>
          )}

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
                    title={item.tooltip || item.label}
                  >
                    <div className="as-nav-link-main">
                      <span className="as-nav-icon">
                        {item.icon}
                        {collapsed && item.badge && (
                          <span
                            className={`as-nav-dot-badge ${
                              item.badgeClass === 'as-badge--warning'
                                ? 'as-nav-dot-badge--warning'
                                : item.badgeClass === 'as-badge--live'
                                ? 'as-nav-dot-badge--live'
                                : 'as-nav-dot-badge--default'
                            }`}
                          />
                        )}
                      </span>
                      {!collapsed && <span className="as-nav-label">{item.label}</span>}
                    </div>
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
            <AudioThemeControls
              compact={collapsed}
              orientation={collapsed ? 'vertical' : 'horizontal'}
            />
          </div>
        </div>

        {/* ─── Footer User Card ─── */}
        <div className="as-footer">
          {isConnected && authUser ? (
            collapsed ? (
              <div className="as-footer-collapsed">
                <div
                  className="as-user-avatar as-user-avatar--collapsed"
                  onClick={() => {
                    soundManager.playClick()
                    navigate('/profile')
                  }}
                  title={`Profil de ${authUser.username} (Niveau ${userLevel}) — Cliquer pour ouvrir`}
                >
                  <span>{userInitial}</span>
                  {authUser.isAdmin && <span className="as-user-crown">👑</span>}
                </div>
                <button
                  type="button"
                  className="as-logout-btn as-logout-btn--collapsed"
                  onClick={handleLogout}
                  title="Se déconnecter"
                  aria-label="Déconnexion"
                >
                  <IconLogOut />
                </button>
              </div>
            ) : (
              <div className="as-user-card">
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

                <button
                  type="button"
                  className="as-logout-btn"
                  onClick={handleLogout}
                  title="Se déconnecter"
                  aria-label="Déconnexion"
                >
                  <IconLogOut />
                </button>
              </div>
            )
          ) : collapsed ? (
            <div className="as-footer-collapsed">
              <button
                type="button"
                className="as-login-icon-btn"
                onClick={() => {
                  soundManager.playClick()
                  navigate('/login')
                }}
                title="Se connecter"
                aria-label="Se connecter"
              >
                <IconLogin />
              </button>
            </div>
          ) : (
            <div className="as-guest-card">
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
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
