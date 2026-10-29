import { useState, useEffect } from 'react'
import { soundManager } from '../utils/sound'
import { themeManager, AVAILABLE_THEMES } from '../utils/theme'
import type { ThemeId } from '../utils/theme'
import { IconVolume, IconVolumeMute, IconPalette } from './Icons'
import './AudioThemeControls.css'

interface AudioThemeControlsProps {
  compact?: boolean
}

export default function AudioThemeControls({ compact = false }: AudioThemeControlsProps) {
  const [muted, setMuted] = useState(soundManager.isMuted())
  const [theme, setTheme] = useState<ThemeId>(themeManager.getTheme())

  useEffect(() => {
    const unsubSound = soundManager.subscribe(m => setMuted(m))
    const unsubTheme = themeManager.subscribe(t => setTheme(t))
    return () => {
      unsubSound()
      unsubTheme()
    }
  }, [])

  const handleToggleSound = () => {
    const nextMuted = soundManager.toggleMute()
    if (!nextMuted) {
      soundManager.playClick()
    }
  }

  const handleCycleTheme = () => {
    soundManager.playClick()
    themeManager.cycleTheme()
  }

  const currentThemeMeta = AVAILABLE_THEMES.find(t => t.id === theme) ?? AVAILABLE_THEMES[0]

  return (
    <div className="at-controls">
      {/* Sound Mute Toggle */}
      <button
        type="button"
        className={`at-btn ${muted ? 'at-btn--muted' : 'at-btn--active'}`}
        onClick={handleToggleSound}
        title={muted ? 'Activer le son' : 'Couper le son'}
        aria-label={muted ? 'Activer le son' : 'Couper le son'}
      >
        {muted ? <IconVolumeMute /> : <IconVolume />}
        {!compact && <span>{muted ? 'Muet' : 'Audio ON'}</span>}
      </button>

      {/* Theme Switcher Button */}
      <button
        type="button"
        className="at-btn"
        onClick={handleCycleTheme}
        title={`Thème actuel : ${currentThemeMeta.name} (cliquer pour changer)`}
        aria-label={`Changer de thème, actuel : ${currentThemeMeta.name}`}
      >
        <IconPalette />
        <span
          className="at-theme-badge"
          style={{ backgroundColor: currentThemeMeta.color }}
        />
        {!compact && <span>{currentThemeMeta.name}</span>}
      </button>
    </div>
  )
}

