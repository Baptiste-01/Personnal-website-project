import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAME_CATALOG, type GameInfo, type GameStatus } from '../../data/games'
import {
  IconGamepad,
  IconUsers,
  IconClock,
  IconSparkles,
  IconCheck,
  IconHeart,
  IconX,
} from '../../components/Icons'
import { soundManager } from '../../utils/sound'
import './GamesHub.css'

export default function GamesHub() {
  const navigate = useNavigate()

  const [activeFilter, setActiveFilter] = useState<'all' | GameStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null)

  useEffect(() => {
    document.title = 'Smik Party — Catalogue de Jeux'
  }, [])
  const [votedGames, setVotedGames] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('smik_game_votes')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const filteredGames = useMemo(() => {
    return GAME_CATALOG.filter(game => {
      const matchFilter = activeFilter === 'all' || game.status === activeFilter
      const query = searchQuery.toLowerCase().trim()
      const matchSearch =
        !query ||
        game.title.toLowerCase().includes(query) ||
        game.tagline.toLowerCase().includes(query) ||
        game.category.toLowerCase().includes(query) ||
        game.tags.some(t => t.toLowerCase().includes(query))
      return matchFilter && matchSearch
    })
  }, [activeFilter, searchQuery])

  const handleVote = (gameId: string) => {
    soundManager.playCorrect()
    const next = new Set(votedGames)
    if (next.has(gameId)) {
      next.delete(gameId)
    } else {
      next.add(gameId)
    }
    setVotedGames(next)
    localStorage.setItem('smik_game_votes', JSON.stringify(Array.from(next)))
  }

  const getStatusBadge = (status: GameStatus) => {
    switch (status) {
      case 'available':
        return <span className="gh-status-badge gh-status-badge--available">🟢 En Ligne</span>
      case 'coming_soon':
        return <span className="gh-status-badge gh-status-badge--coming">⏳ Bientôt disponible</span>
      case 'in_development':
        return <span className="gh-status-badge gh-status-badge--dev">🛠️ En Développement</span>
    }
  }

  return (
    <div className="gh-page" id="games-hub-page">
      {/* Background ambient orbs */}
      <div className="gh-bg-orb gh-bg-orb--1" />
      <div className="gh-bg-orb gh-bg-orb--2" />

      {/* Hero Header */}
      <header className="gh-hero">
        <div className="gh-hero-content">
          <div className="gh-hero-badge">
            <IconSparkles />
            <span>Catalogue & Architecture Multi-Jeux</span>
          </div>
          <h1 className="gh-title">
            Centre de Jeux <span className="gh-title-accent">Smik Party</span>
          </h1>
          <p className="gh-subtitle">
            Explorez notre univers de jeux multijoueurs en temps réel. <strong>FlashGuess</strong> est
            disponible dès maintenant, et plusieurs autres classiques sous haute pression arrivent
            très bientôt sur la plateforme !
          </p>
        </div>

        {/* Filter bar & Search */}
        <div className="gh-controls">
          <div className="gh-filter-tabs">
            <button
              type="button"
              className={`gh-filter-tab ${activeFilter === 'all' ? 'gh-filter-tab--active' : ''}`}
              onClick={() => {
                soundManager.playClick()
                setActiveFilter('all')
              }}
            >
              Tous ({GAME_CATALOG.length})
            </button>
            <button
              type="button"
              className={`gh-filter-tab ${activeFilter === 'available' ? 'gh-filter-tab--active' : ''}`}
              onClick={() => {
                soundManager.playClick()
                setActiveFilter('available')
              }}
            >
              🟢 Disponibles (1)
            </button>
            <button
              type="button"
              className={`gh-filter-tab ${activeFilter === 'coming_soon' ? 'gh-filter-tab--active' : ''}`}
              onClick={() => {
                soundManager.playClick()
                setActiveFilter('coming_soon')
              }}
            >
              ⏳ Bientôt (2)
            </button>
            <button
              type="button"
              className={`gh-filter-tab ${activeFilter === 'in_development' ? 'gh-filter-tab--active' : ''}`}
              onClick={() => {
                soundManager.playClick()
                setActiveFilter('in_development')
              }}
            >
              🛠️ En cours (2)
            </button>
          </div>

          <div className="gh-search-box">
            <input
              type="text"
              placeholder="Rechercher un jeu, mot, tag..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="gh-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="gh-search-clear"
                onClick={() => setSearchQuery('')}
                title="Effacer la recherche"
              >
                <IconX />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Games Cards Grid */}
      <main className="gh-grid-container">
        {filteredGames.length > 0 ? (
          <div className="gh-grid">
            {filteredGames.map(game => {
              const hasVoted = votedGames.has(game.id)

              return (
                <div
                  key={game.id}
                  className={`gh-card ${game.status === 'available' ? 'gh-card--featured' : ''}`}
                  style={{ '--game-accent': game.accentColor } as React.CSSProperties}
                >
                  <div className="gh-card-header">
                    <div className="gh-card-icon-box">
                      <span className="gh-card-icon">{game.icon}</span>
                    </div>
                    <div className="gh-card-header-meta">
                      <span className="gh-card-cat">{game.category}</span>
                      {getStatusBadge(game.status)}
                    </div>
                  </div>

                  <div className="gh-card-body">
                    <h2 className="gh-card-title">{game.title}</h2>
                    <p className="gh-card-tagline">{game.tagline}</p>
                    <p className="gh-card-desc">{game.description}</p>

                    <div className="gh-card-metrics">
                      <div className="gh-metric-item">
                        <IconUsers />
                        <span>{game.playersRange}</span>
                      </div>
                      <div className="gh-metric-item">
                        <IconClock />
                        <span>{game.roundDuration}</span>
                      </div>
                    </div>

                    <div className="gh-card-tags">
                      {game.tags.map(t => (
                        <span key={t} className="gh-tag">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="gh-card-footer">
                    {game.status === 'available' ? (
                      <button
                        type="button"
                        className="gh-btn gh-btn--play"
                        onClick={() => {
                          soundManager.playClick()
                          navigate('/')
                        }}
                      >
                        <IconGamepad />
                        <span>Rejoindre une arène</span>
                      </button>
                    ) : (
                      <div className="gh-footer-actions">
                        <button
                          type="button"
                          className="gh-btn gh-btn--details"
                          onClick={() => {
                            soundManager.playClick()
                            setSelectedGame(game)
                          }}
                        >
                          <span>Règles & Aperçu</span>
                        </button>
                        <button
                          type="button"
                          className={`gh-vote-btn ${hasVoted ? 'gh-vote-btn--voted' : ''}`}
                          onClick={() => handleVote(game.id)}
                          title={hasVoted ? 'Vous avez voté pour ce jeu !' : 'Voter pour ce jeu'}
                        >
                          <IconHeart filled={hasVoted} />
                          <span>{hasVoted ? 'Soutenu !' : 'Voter'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="gh-empty-state">
            <span style={{ fontSize: 36 }}>🔍</span>
            <h3>Aucun jeu trouvé</h3>
            <p>Essayez de modifier votre recherche ou de sélectionner « Tous les jeux ».</p>
          </div>
        )}
      </main>

      {/* Modal Detailed Preview */}
      {selectedGame && (
        <div className="gh-modal-backdrop" onClick={() => setSelectedGame(null)}>
          <div
            className="gh-modal"
            onClick={e => e.stopPropagation()}
            style={{ '--game-accent': selectedGame.accentColor } as React.CSSProperties}
          >
            <div className="gh-modal-head">
              <div className="gh-modal-title-group">
                <span className="gh-modal-icon">{selectedGame.icon}</span>
                <div>
                  <h3 className="gh-modal-title">{selectedGame.title}</h3>
                  <span className="gh-modal-cat">{selectedGame.category}</span>
                </div>
              </div>
              <button
                type="button"
                className="gh-modal-close"
                onClick={() => setSelectedGame(null)}
              >
                <IconX />
              </button>
            </div>

            <div className="gh-modal-content">
              <div className="gh-modal-status-row">
                {getStatusBadge(selectedGame.status)}
                <span className="gh-modal-diff">Difficulté : {selectedGame.difficulty}</span>
              </div>

              <p className="gh-modal-desc">{selectedGame.description}</p>

              <h4 className="gh-modal-subheading">Fonctionnalités & Mécaniques Prévues :</h4>
              <ul className="gh-modal-highlights">
                {selectedGame.highlights.map((h, i) => (
                  <li key={i}>
                    <IconCheck />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="gh-modal-info-box">
                <p>
                  💡 <strong>Développement de ce jeu :</strong> Vous souhaitez voir ce jeu arriver
                  en priorité sur Smik Party ? Cliquez sur « Soutenir » pour faire grimper son
                  classement dans la roadmap !
                </p>
              </div>
            </div>

            <div className="gh-modal-footer">
              <button
                type="button"
                className={`gh-btn ${
                  votedGames.has(selectedGame.id) ? 'gh-btn--voted' : 'gh-btn--vote'
                }`}
                onClick={() => handleVote(selectedGame.id)}
              >
                <IconHeart filled={votedGames.has(selectedGame.id)} />
                <span>
                  {votedGames.has(selectedGame.id)
                    ? 'Jeu soutenu ! (Cliquez pour annuler)'
                    : 'Soutenir l\'arrivée de ce jeu (+1 vote)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
