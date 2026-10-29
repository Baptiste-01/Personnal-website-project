/**
 * Theme Manager for JKLM Clone (Smik Party)
 * Supports dynamic CSS variable switching and persistent local storage.
 */

export type ThemeId = 'retro' | 'dark' | 'cyberpunk'

export interface ThemeOption {
  id: ThemeId
  name: string
  color: string
  icon: string
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  { id: 'retro', name: 'Néo-Arcade', color: '#3b82f6', icon: '🎮' },
  { id: 'dark', name: 'Dark Zinc', color: '#8b5cf6', icon: '🌙' },
  { id: 'cyberpunk', name: 'Cyberpunk', color: '#ec4899', icon: '⚡' },
]

type ThemeListener = (theme: ThemeId) => void

class ThemeManager {
  private currentTheme: ThemeId = 'retro'
  private listeners: Set<ThemeListener> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('smik_theme') as ThemeId | null
      if (stored && (stored === 'retro' || stored === 'dark' || stored === 'cyberpunk')) {
        this.currentTheme = stored
      }
      this.applyTheme(this.currentTheme)
    }
  }

  public getTheme(): ThemeId {
    return this.currentTheme
  }

  public setTheme(theme: ThemeId): void {
    this.currentTheme = theme
    this.applyTheme(theme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('smik_theme', theme)
    }
    this.listeners.forEach(fn => fn(theme))
  }

  public cycleTheme(): ThemeId {
    const ids: ThemeId[] = ['retro', 'dark', 'cyberpunk']
    const nextIdx = (ids.indexOf(this.currentTheme) + 1) % ids.length
    const nextTheme = ids[nextIdx]
    this.setTheme(nextTheme)
    return nextTheme
  }

  public subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private applyTheme(theme: ThemeId): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }
}

export const themeManager = new ThemeManager()

