import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconGamepad, IconLogin } from '../../components/Icons'
import './Login.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // TODO: Implement real authentication
    await new Promise(r => setTimeout(r, 800))

    if (email && password) {
      // Placeholder: redirect back to lobby on success
      navigate('/')
    } else {
      setError('Veuillez remplir tous les champs.')
    }
    setIsLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-bg-glow login-bg-glow--1" />
      <div className="login-bg-glow login-bg-glow--2" />

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <IconGamepad />
          </div>
          <h1 className="login-brand-title">
            Smik <span className="login-brand-accent">Party</span>
          </h1>
        </div>

        <h2 className="login-title">Connexion</h2>
        <p className="login-subtitle">
          Accédez à vos favoris et à votre historique de jeux.
        </p>

        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Adresse email</label>
            <input
              id="login-email"
              type="email"
              className="login-input"
              placeholder="jean@exemple.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`login-submit ${isLoading ? 'is-loading' : ''}`}
            id="login-submit-button"
            disabled={isLoading}
          >
            <IconLogin />
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="login-divider">
          <span>ou</span>
        </div>

        <p className="login-register-hint">
          Pas encore de compte ?{' '}
          <a href="#" className="login-register-link" id="register-link">
            Créer un compte
          </a>
        </p>

        <button
          className="login-back"
          id="login-back-button"
          onClick={() => navigate('/')}
        >
          Retour au lobby
        </button>
      </div>
    </div>
  )
}
