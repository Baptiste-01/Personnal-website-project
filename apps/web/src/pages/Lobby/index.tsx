import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconGamepad, IconRefresh, IconZap, IconGlobe,
  IconTrophy, IconInbox, IconAlertCircle, IconUser
} from '../../components/Icons'
import './Lobby.css'

interface ArenaItem {
  id: string
  name: string
  players: number
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  gameMode: string
  difficulty: string
}

type FetchState = 'idle' | 'loading' | 'success' | 'error'

function SkeletonList() {
  return (
    <div className="skeleton-list">
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton-item">
          <div className="skeleton-info">
            <div className="skeleton-line skeleton-line--name" />
            <div className="skeleton-line skeleton-line--meta" />
          </div>
          <div className="skeleton-actions">
            <div className="skeleton-badge" />
            <div className="skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ArenaCard({ arena, onJoin }: { arena: ArenaItem; onJoin: (id: string) => void }) {
  const statusClass = arena.status === 'playing' ? 'status-badge--live' : 'status-badge--waiting'
  const statusLabel = arena.status === 'playing' ? 'En cours' : 'En attente'

  return (
    <div className="arena-card" id={`arena-${arena.id}`} onClick={() => onJoin(arena.id)}>
      <div className="arena-info">
        <span className="arena-name">{arena.name}</span>
        <span className="arena-meta">
          FlashGuess -- {arena.difficulty.charAt(0).toUpperCase() + arena.difficulty.slice(1)}
        </span>
      </div>
      <div className="arena-actions">
        <span className="player-count">
          <IconUser />
          {arena.players}/{arena.maxPlayers}
        </span>
        <span className={`status-badge ${statusClass}`}>
          <span className="status-dot" />
          {statusLabel}
        </span>
        <button className="btn-join" id={`join-arena-${arena.id}`}>Entrer</button>
      </div>
    </div>
  )
}

export default function Lobby() {
  const navigate = useNavigate()
  const [arenas, setArenas] = useState<ArenaItem[]>([])
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchArenas = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true)
    else setFetchState('loading')

    try {
      const res = await fetch('http://localhost:3000/arenas')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ArenaItem[] = await res.json()
      setArenas(data)
      setFetchState('success')
    } catch (err) {
      console.error('Erreur chargement arenes:', err)
      setFetchState('error')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchArenas() }, [fetchArenas])

  return (
    <div className="lobby">
      <header className="lobby-header" id="lobby-header">
        <div className="lobby-brand">
          <div className="lobby-brand-icon"><IconGamepad /></div>
          <h1 className="lobby-title">
            Smik <span className="lobby-title-accent">Party</span>
          </h1>
        </div>
        <p className="lobby-subtitle">
          Testez vos connaissances en temps reel. Rejoignez une arene et prouvez que vous etes le plus rapide.
        </p>
      </header>

      <main className="lobby-main" id="lobby-main">
        <div className="lobby-panel" id="arenas-panel">
          <div className="lobby-panel-header">
            <h2 className="lobby-panel-title">Arenes disponibles</h2>
            <button
              className={`btn-refresh ${isRefreshing ? 'is-loading' : ''}`}
              onClick={() => fetchArenas(true)}
              disabled={isRefreshing}
              id="refresh-button"
            >
              <IconRefresh />
              {isRefreshing ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {fetchState === 'loading' && <SkeletonList />}
          {fetchState === 'error' && (
            <div className="error-banner fade-in" role="alert">
              <IconAlertCircle />
              <span className="error-banner-text">Impossible de charger les arenes.</span>
              <button className="error-banner-retry" onClick={() => fetchArenas()}>Reessayer</button>
            </div>
          )}
          {fetchState === 'success' && arenas.length === 0 && (
            <div className="empty-state fade-in">
              <div className="empty-state-icon"><IconInbox /></div>
              <h3 className="empty-state-title">Aucune arene disponible</h3>
              <p className="empty-state-text">Aucune arene active pour le moment.</p>
            </div>
          )}
          {fetchState === 'success' && arenas.length > 0 && (
            <div className="arena-list" id="arena-list">
              {arenas.map(a => (
                <ArenaCard key={a.id} arena={a} onJoin={id => navigate(`/arena/${id}`)} />
              ))}
            </div>
          )}
        </div>

        <section className="features" id="features-section">
          <div className="feature-card">
            <div className="feature-icon"><IconZap /></div>
            <h3 className="feature-title">Temps reel</h3>
            <p className="feature-desc">Repondez le plus vite possible pour maximiser vos points.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><IconGlobe /></div>
            <h3 className="feature-title">Multijoueur</h3>
            <p className="feature-desc">Affrontez d'autres joueurs dans des arenes publiques.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><IconTrophy /></div>
            <h3 className="feature-title">8 categories</h3>
            <p className="feature-desc">Geographie, cinema, musique, sport et bien plus encore.</p>
          </div>
        </section>
      </main>

      <footer className="lobby-footer" id="lobby-footer">
        <p className="lobby-footer-text">Smik Party -- Projet open source</p>
      </footer>
    </div>
  )
}
