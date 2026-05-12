import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconGamepad, IconUser, IconCheck, IconClock } from '../../components/Icons'
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../types'
import type { Category, Difficulty, GameSettings } from '../../types'
import './Arena.css'

const ALL_CATEGORIES: Category[] = ['geographie', 'histoire', 'sciences', 'cinema', 'musique', 'sport', 'litterature', 'gastronomie']
const ROUND_OPTIONS = [5, 10, 15, 20]
const TIME_OPTIONS = [10, 15, 20, 30]

export default function Arena() {
  const { arenaId } = useParams<{ arenaId: string }>()
  const navigate = useNavigate()
  const [arenaName, setArenaName] = useState('Chargement...')
  const [settings, setSettings] = useState<GameSettings>({
    categories: ['geographie', 'histoire', 'sciences', 'cinema', 'musique'],
    difficulty: 'facile',
    roundCount: 10,
    timePerRound: 20,
  })

  useEffect(() => {
    fetch(`http://localhost:3000/arenas/${arenaId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setArenaName(data.name) })
      .catch(() => setArenaName('Arene'))
  }, [arenaId])

  const toggleCategory = (cat: Category) => {
    setSettings(prev => {
      const has = prev.categories.includes(cat)
      if (has && prev.categories.length === 1) return prev
      return { ...prev, categories: has ? prev.categories.filter(c => c !== cat) : [...prev.categories, cat] }
    })
  }

  const startGame = () => {
    const params = new URLSearchParams({
      categories: settings.categories.join(','),
      difficulty: settings.difficulty,
      rounds: String(settings.roundCount),
      time: String(settings.timePerRound),
    })
    navigate(`/play/${arenaId}?${params.toString()}`)
  }

  return (
    <div className="arena" id="arena-page">
      <header className="arena-topbar">
        <button className="arena-back" onClick={() => navigate('/')} id="back-to-lobby">
          <IconArrowLeft /><span>Retour</span>
        </button>
        <div className="arena-topbar-center">
          <div className="arena-topbar-icon"><IconGamepad /></div>
          <h1 className="arena-topbar-title">{arenaName}</h1>
        </div>
        <div className="arena-topbar-right">
          <span className="arena-player-count"><IconUser /> 1</span>
        </div>
      </header>

      <div className="arena-layout">
        {/* Player sidebar */}
        <aside className="arena-sidebar">
          <div className="sidebar-header">
            <h2 className="sidebar-title">Joueurs</h2>
            <span className="sidebar-count">1</span>
          </div>
          <div className="arena-player-list">
            <div className="arena-player-card arena-player-card--self">
              <div className="arena-player-avatar"><IconUser /></div>
              <div className="arena-player-details">
                <span className="arena-player-name">Vous <span className="arena-host-tag">Hote</span></span>
                <span className="arena-player-status-text">Pret</span>
              </div>
              <div className="arena-player-ready"><IconCheck /></div>
            </div>
          </div>
        </aside>

        {/* Settings panel */}
        <main className="arena-main">
          <div className="settings-panel fade-in">
            <h2 className="settings-title">Configuration de la partie</h2>
            <p className="settings-subtitle">Choisissez les parametres avant de lancer FlashGuess.</p>

            {/* Categories */}
            <div className="settings-section">
              <h3 className="settings-label">Categories</h3>
              <div className="category-grid">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`category-chip ${settings.categories.includes(cat) ? 'category-chip--active' : ''}`}
                    onClick={() => toggleCategory(cat)}
                    id={`category-${cat}`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="settings-section">
              <h3 className="settings-label">Difficulte</h3>
              <div className="difficulty-options">
                {(['facile', 'moyen', 'difficile'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    className={`difficulty-btn ${settings.difficulty === d ? 'difficulty-btn--active' : ''}`}
                    onClick={() => setSettings(prev => ({ ...prev, difficulty: d }))}
                    id={`difficulty-${d}`}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div className="settings-section">
              <h3 className="settings-label">Nombre de manches</h3>
              <div className="option-pills">
                {ROUND_OPTIONS.map(n => (
                  <button
                    key={n}
                    className={`option-pill ${settings.roundCount === n ? 'option-pill--active' : ''}`}
                    onClick={() => setSettings(prev => ({ ...prev, roundCount: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Time per round */}
            <div className="settings-section">
              <h3 className="settings-label">Temps par question</h3>
              <div className="option-pills">
                {TIME_OPTIONS.map(t => (
                  <button
                    key={t}
                    className={`option-pill ${settings.timePerRound === t ? 'option-pill--active' : ''}`}
                    onClick={() => setSettings(prev => ({ ...prev, timePerRound: t }))}
                  >
                    <IconClock /> {t}s
                  </button>
                ))}
              </div>
            </div>

            {/* Start */}
            <button className="btn-start-game" onClick={startGame} id="start-game">
              Lancer la partie
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
