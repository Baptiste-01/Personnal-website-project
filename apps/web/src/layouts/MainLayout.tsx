import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import AppSidebar from '../components/AppSidebar/AppSidebar'
import { IconMenu, IconGamepad } from '../components/Icons'
import AudioThemeControls from '../components/AudioThemeControls'
import { soundManager } from '../utils/sound'
import './MainLayout.css'

export default function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('smik_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const [mobileOpen, setMobileOpen] = useState(false)

  const handleToggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('smik_sidebar_collapsed', String(next))
      return next
    })
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Close mobile drawer on resize to larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 860 && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mobileOpen])

  return (
    <div
      className={`app-shell ${
        collapsed ? 'app-shell--sidebar-collapsed' : 'app-shell--sidebar-expanded'
      }`}
      id="main-app-shell"
    >
      {/* Main Persistent / Drawer Sidebar */}
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Routed Area */}
      <div className="app-shell-main">
        {/* Mobile Top Navigation Bar (replaces floating hamburger to prevent any overlap) */}
        <header className="app-mobile-topbar" id="app-mobile-topbar">
          <button
            type="button"
            className="app-mobile-hamburger"
            onClick={() => {
              soundManager.playClick()
              setMobileOpen(true)
            }}
            title="Ouvrir le menu de navigation"
            aria-label="Ouvrir le menu"
          >
            <IconMenu />
          </button>

          <div
            className="app-mobile-brand"
            onClick={() => {
              soundManager.playClick()
              navigate('/')
            }}
            title="Smik Party - Accueil"
          >
            <div className="app-mobile-brand-icon">
              <IconGamepad />
            </div>
            <span className="app-mobile-brand-title">
              Smik <span className="app-mobile-brand-accent">Party</span>
            </span>
          </div>

          <div className="app-mobile-actions">
            <AudioThemeControls compact />
          </div>
        </header>

        {/* Routed Content View */}
        <div className="app-shell-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
