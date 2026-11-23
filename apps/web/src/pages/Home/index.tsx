import { useNavigate, Link } from 'react-router-dom'
import { GAME_CATALOG, type GameInfo } from '../../data/games'
import {
  IconGamepad,
  IconZap,
  IconTrophy,
  IconSparkles,
  IconUsers,
  IconClock,
  IconFlame,
  IconShield,
  IconChevronRight,
  IconDice,
  IconTarget,
} from '../../components/Icons'
import ArcadeBackground from '../../components/ArcadeBackground/ArcadeBackground'
import { soundManager } from '../../utils/sound'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  const handlePlaySpeedSmik = () => {
    soundManager.playClick()
    navigate('/speedsmik')
  }

  const handleExploreGames = () => {
    soundManager.playClick()
    const hubElement = document.getElementById('games-hub-section')
    if (hubElement) {
      hubElement.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/games')
    }
  }

  const handleGoToCatalog = () => {
    soundManager.playClick()
    navigate('/games')
  }

  return (
    <div className="home-page" id="home-landing-page">
      {/* ─── Animated Pixel Arcade Background with Runner & Fighter ─── */}
      <ArcadeBackground variant="home" />

      <div className="home-container">
        {/* ─── Hero Section ─── */}
        <section className="home-hero">
          <div className="home-badge-container">
            <span className="home-hero-badge">
              <IconSparkles />
              <span>Plateforme Arcade Multijoueur Temps Réel</span>
            </span>
            <span className="home-version-badge">v2.0 Neo-Arcade</span>
          </div>

          <h1 className="home-title">
            Smik <span className="home-title-accent">Party</span>
          </h1>

          <p className="home-subtitle">
            L'univers d'arcade nouvelle génération inspiré des classiques du web.
            Défiez vos amis et la communauté sur des arènes en direct à haute intensité,
            buzzers synchronisés et ambiance rétro immersive.
          </p>

          <div className="home-cta-group">
            <button
              type="button"
              className="home-btn home-btn--primary"
              onClick={handlePlaySpeedSmik}
              id="hero-play-speedsmik-btn"
            >
              <IconZap />
              <span>Jouer à SpeedSmik</span>
              <span className="home-btn-pill">En direct</span>
            </button>

            <button
              type="button"
              className="home-btn home-btn--secondary"
              onClick={handleExploreGames}
              id="hero-explore-hub-btn"
            >
              <IconGamepad />
              <span>Hub des Jeux</span>
              <IconChevronRight />
            </button>

            <button
              type="button"
              className="home-btn home-btn--ghost"
              onClick={handleGoToCatalog}
              id="hero-catalog-btn"
            >
              <IconDice />
              <span>Catalogue & Roadmap</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="home-metrics-bar">
            <div className="home-metric-item">
              <div className="home-metric-icon"><IconZap /></div>
              <div className="home-metric-text">
                <span className="home-metric-val">Temps Réel</span>
                <span className="home-metric-desc">WebSockets synchronisés</span>
              </div>
            </div>
            <div className="home-metric-sep" />
            <div className="home-metric-item">
              <div className="home-metric-icon"><IconUsers /></div>
              <div className="home-metric-text">
                <span className="home-metric-val">1 à 50 Joueurs</span>
                <span className="home-metric-desc">Arènes privées & publiques</span>
              </div>
            </div>
            <div className="home-metric-sep" />
            <div className="home-metric-item">
              <div className="home-metric-icon"><IconFlame /></div>
              <div className="home-metric-text">
                <span className="home-metric-val">Combos & Buzzers</span>
                <span className="home-metric-desc">Multiplicateurs de flammes</span>
              </div>
            </div>
            <div className="home-metric-sep" />
            <div className="home-metric-item">
              <div className="home-metric-icon"><IconShield /></div>
              <div className="home-metric-text">
                <span className="home-metric-val">Anti-Triche & Zero Lag</span>
                <span className="home-metric-desc">Validation instantanée</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Featured Game Spotlight: SpeedSmik (JKLM Clone) ─── */}
        <section className="home-spotlight" id="speedsmik-spotlight">
          <div className="spotlight-card">
            <div className="spotlight-badge-row">
              <span className="spotlight-badge-live">
                <span className="status-dot-pulse" />
                Jeu Phare Disponible
              </span>
            </div>

            <div className="spotlight-main">
              <div className="spotlight-info">
                <h2 className="spotlight-title">
                  Speed<span className="home-title-accent">Smik</span>
                </h2>
                <p className="spotlight-tagline">
                  Le jeu de rapidité et de culture générale multijoueur où chaque milliseconde décide du vainqueur.
                </p>
                <p className="spotlight-description">
                  Une question s'affiche simultanément pour tous les joueurs. Le plus rapide à saisir la bonne réponse rafle le pactole de points et déclenche des flammes de combo. Configurez vos arènes sur-mesure ou défiez la communauté en ligne !
                </p>

                <div className="spotlight-features-grid">
                  <div className="spotlight-feature-chip">
                    <IconTarget />
                    <span>Multi-thèmes (Sciences, Histoire, Géo, Cinéma...)</span>
                  </div>
                  <div className="spotlight-feature-chip">
                    <IconClock />
                    <span>Mode Speedrun express à 5s chrono</span>
                  </div>
                  <div className="spotlight-feature-chip">
                    <IconUsers />
                    <span>Salons personnalisés jusqu'à 50 joueurs</span>
                  </div>
                  <div className="spotlight-feature-chip">
                    <IconTrophy />
                    <span>Codes Templates de configuration partageables</span>
                  </div>
                </div>

                <div className="spotlight-actions">
                  <button
                    type="button"
                    className="home-btn home-btn--primary"
                    onClick={handlePlaySpeedSmik}
                    id="spotlight-play-btn"
                  >
                    <IconZap />
                    <span>Rejoindre SpeedSmik</span>
                  </button>
                  <Link
                    to="/speedsmik"
                    className="home-btn home-btn--secondary"
                    onClick={() => soundManager.playClick()}
                  >
                    <IconGamepad />
                    <span>Créer un salon</span>
                  </Link>
                </div>
              </div>

              <div className="spotlight-visual">
                <div className="spotlight-screen-mockup">
                  <div className="mockup-header">
                    <span className="mockup-dot red" />
                    <span className="mockup-dot yellow" />
                    <span className="mockup-dot green" />
                    <span className="mockup-title">ARENA // LIVE MULTIPLAYER</span>
                  </div>
                  <div className="mockup-body">
                    <div className="mockup-question-box">
                      <span className="mockup-badge">SPEED TEST</span>
                      <p className="mockup-question">« Quel est le langage principal exécuté dans le navigateur ? »</p>
                    </div>
                    <div className="mockup-answer-row">
                      <span className="mockup-user">Player_01</span>
                      <span className="mockup-answer-correct">JavaScript ! (+240 pts) 🔥</span>
                    </div>
                    <div className="mockup-stats-row">
                      <span>⏱️ 1.42s</span>
                      <span>🏆 Série x2.0</span>
                      <span>👥 8 joueurs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Game Hub Grid ─── */}
        <section className="home-hub-section" id="games-hub-section">
          <div className="section-header">
            <span className="section-badge">
              <IconGamepad />
              <span>Hub des Jeux</span>
            </span>
            <h2 className="section-title">
              L'Arène <span className="home-title-accent">Multi-Jeux</span>
            </h2>
            <p className="section-subtitle">
              Tous nos modes de jeux en temps réel. Rejoignez les modes disponibles ou votez pour accélérer la sortie des prochains univers !
            </p>
          </div>

          <div className="home-games-grid">
            {GAME_CATALOG.map((game: GameInfo) => {
              const isAvailable = game.status === 'available'
              return (
                <div
                  key={game.id}
                  className={`home-game-card ${isAvailable ? 'home-game-card--active' : ''}`}
                  style={{ '--game-accent': game.accentColor } as React.CSSProperties}
                >
                  <div className="home-game-card-top">
                    <div className="home-game-icon-box">
                      <span className="home-game-icon">{game.icon}</span>
                    </div>
                    <div className="home-game-badges">
                      {isAvailable ? (
                        <span className="game-status-badge game-status-badge--live">
                          <span className="status-dot-pulse" />
                          En Ligne
                        </span>
                      ) : game.status === 'coming_soon' ? (
                        <span className="game-status-badge game-status-badge--soon">
                          ⏳ Bientôt disponible
                        </span>
                      ) : (
                        <span className="game-status-badge game-status-badge--dev">
                          🛠️ En Développement
                        </span>
                      )}
                      <span className="game-category-badge">{game.category}</span>
                    </div>
                  </div>

                  <h3 className="home-game-title">{game.title}</h3>
                  <p className="home-game-tagline">{game.tagline}</p>

                  <div className="home-game-meta">
                    <div className="home-meta-item">
                      <IconUsers />
                      <span>{game.playersRange}</span>
                    </div>
                    <div className="home-meta-item">
                      <IconClock />
                      <span>{game.roundDuration}</span>
                    </div>
                  </div>

                  <div className="home-game-highlights">
                    {game.highlights.slice(0, 2).map((hl, i) => (
                      <div key={i} className="home-game-highlight-item">
                        <span className="highlight-bullet">▹</span>
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>

                  <div className="home-game-footer">
                    {isAvailable ? (
                      <button
                        type="button"
                        className="home-btn home-btn--primary home-btn--sm home-btn--full"
                        onClick={() => {
                          soundManager.playClick()
                          navigate(game.route || '/speedsmik')
                        }}
                      >
                        <IconZap />
                        <span>Rejoindre l'arène</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="home-btn home-btn--secondary home-btn--sm home-btn--full"
                        onClick={() => {
                          soundManager.playClick()
                          navigate('/games')
                        }}
                      >
                        <span>Détails & Vote</span>
                        <IconChevronRight />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="home-hub-bottom-cta">
            <button
              type="button"
              className="home-btn home-btn--ghost home-btn--sm"
              onClick={handleGoToCatalog}
            >
              <IconDice />
              <span>Voir le catalogue complet & voter pour les prochains modes</span>
              <IconChevronRight />
            </button>
          </div>
        </section>

        {/* ─── Platform Pillars / Features ─── */}
        <section className="home-pillars-section">
          <div className="section-header">
            <span className="section-badge">
              <IconSparkles />
              <span>Pourquoi Smik Party ?</span>
            </span>
            <h2 className="section-title">
              L'Expérience Arcade <span className="home-title-accent">Sans Compromis</span>
            </h2>
            <p className="section-subtitle">
              Conçu pour la compétition, l'instantanéité et le plaisir pur du multijoueur sur navigateur.
            </p>
          </div>

          <div className="home-pillars-grid">
            <div className="home-pillar-card">
              <div className="pillar-icon-box"><IconZap /></div>
              <h3 className="pillar-title">Moteur Temps Réel Ultra-Réactif</h3>
              <p className="pillar-desc">
                Architecture WebSocket et SSE calibrée pour des réponses sous 20ms. Le premier qui tape gagne immédiatement la manche sans contestation.
              </p>
            </div>

            <div className="home-pillar-card">
              <div className="pillar-icon-box"><IconTarget /></div>
              <h3 className="pillar-title">Salons & Codes Templates</h3>
              <p className="pillar-desc">
                Personnalisez entièrement vos règles : temps, points, catégories et tags. Générez un code court pour que vos amis rejoignent vos règles en un instant.
              </p>
            </div>

            <div className="home-pillar-card">
              <div className="pillar-icon-box"><IconFlame /></div>
              <h3 className="pillar-title">Ambiance Rétro Immersive</h3>
              <p className="pillar-desc">
                Musiques chiptune et synthwave dynamiques, animations de pixels vivantes en arrière-plan et effets sonores rétro pour chaque bonne réponse.
              </p>
            </div>

            <div className="home-pillar-card">
              <div className="pillar-icon-box"><IconShield /></div>
              <h3 className="pillar-title">Banque Ouverte & Modération</h3>
              <p className="pillar-desc">
                Des milliers de questions enrichies en continu. Modération participative, suspension automatique des questions signalées et thèmes variés.
              </p>
            </div>
          </div>
        </section>

        {/* ─── Final CTA Banner ─── */}
        <section className="home-banner-section">
          <div className="home-banner-card">
            <h2 className="banner-title">Prêt à entrer dans l'arène ?</h2>
            <p className="banner-subtitle">
              Rejoignez une partie en direct sur SpeedSmik dès maintenant sans inscription ou créez votre propre salon privé.
            </p>
            <div className="banner-actions">
              <button
                type="button"
                className="home-btn home-btn--primary"
                onClick={handlePlaySpeedSmik}
              >
                <IconZap />
                <span>Lancer SpeedSmik</span>
              </button>
              <button
                type="button"
                className="home-btn home-btn--secondary"
                onClick={handleGoToCatalog}
              >
                <IconDice />
                <span>Explorer tous les jeux</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
