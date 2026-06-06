import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconGamepad, IconLogin } from '../../components/Icons'
import './Login.css'

/* ─── Types ─── */
type Tab = 'login' | 'register'

interface AuthResponse {
  token: string
  user: {
    id: string
    username: string
    displayName: string
    level: number
    xp: number
  }
  error?: string
}

/* ─── Eye icon (show/hide password) ─── */
const IconEye = ({ open }: { open: boolean }) => open ? (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

/* ─── Strength indicator ─── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(password) ? 1 : 0)

  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort']
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e']

  return (
    <div className="pwd-strength">
      <div className="pwd-strength-bars">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="pwd-strength-bar"
            style={{ background: i <= score ? colors[score] : undefined }}
          />
        ))}
      </div>
      <span className="pwd-strength-label" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  )
}

/* ─── Main Page ─── */
export default function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')

  // Login state
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPwd, setShowLoginPwd] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register state
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [showRegPwd, setShowRegPwd] = useState(false)
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    setLoginError('')
    setRegError('')
  }, [tab])

  /* ── Connexion ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })
      const data: AuthResponse = await res.json()

      if (!res.ok) {
        setLoginError(data.error ?? 'Erreur de connexion.')
      } else {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        navigate('/')
      }
    } catch {
      setLoginError('Impossible de joindre le serveur.')
    } finally {
      setLoginLoading(false)
    }
  }

  /* ── Inscription ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')

    if (regPassword !== regConfirm) {
      setRegError('Les mots de passe ne correspondent pas.')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }

    setRegLoading(true)
    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regUsername, password: regPassword }),
      })
      const data: AuthResponse = await res.json()

      if (!res.ok) {
        setRegError(data.error ?? 'Erreur lors de l\'inscription.')
      } else {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('auth_user', JSON.stringify(data.user))
        navigate('/')
      }
    } catch {
      setRegError('Impossible de joindre le serveur.')
    } finally {
      setRegLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-glow login-bg-glow--1" />
      <div className="login-bg-glow login-bg-glow--2" />

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon"><IconGamepad /></div>
          <h1 className="login-brand-title">
            Smik <span className="login-brand-accent">Party</span>
          </h1>
        </div>

        {/* Tabs */}
        <div className="auth-tabs" id="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('login')}
            id="tab-login"
          >
            Se connecter
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => setTab('register')}
            id="tab-register"
          >
            Créer un compte
          </button>
        </div>

        {/* ── Connexion ── */}
        {tab === 'login' && (
          <form className="login-form" onSubmit={handleLogin} id="login-form">
            <div className="login-field">
              <label className="login-label" htmlFor="login-username">Pseudo</label>
              <input
                ref={firstInputRef}
                id="login-username"
                type="text"
                className="login-input"
                placeholder="ton_pseudo"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="login-password">Mot de passe</label>
              <div className="login-input-wrapper">
                <input
                  id="login-password"
                  type={showLoginPwd ? 'text' : 'password'}
                  className="login-input login-input--with-icon"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowLoginPwd(p => !p)}
                  tabIndex={-1}
                  aria-label={showLoginPwd ? 'Masquer' : 'Afficher'}
                >
                  <IconEye open={showLoginPwd} />
                </button>
              </div>
            </div>

            {loginError && (
              <div className="login-error" role="alert" id="login-error">{loginError}</div>
            )}

            <button
              type="submit"
              className={`login-submit ${loginLoading ? 'is-loading' : ''}`}
              id="login-submit-button"
              disabled={loginLoading}
            >
              <IconLogin />
              {loginLoading ? 'Connexion...' : 'Se connecter'}
            </button>

            <p className="auth-switch-hint">
              Pas encore de compte ?{' '}
              <button type="button" className="auth-switch-link" onClick={() => setTab('register')}>
                Créer un compte
              </button>
            </p>
          </form>
        )}

        {/* ── Inscription ── */}
        {tab === 'register' && (
          <form className="login-form" onSubmit={handleRegister} id="register-form">
            <div className="login-field">
              <label className="login-label" htmlFor="reg-username">
                Pseudo <span className="login-label-hint">3-20 caractères, unique</span>
              </label>
              <input
                ref={firstInputRef}
                id="reg-username"
                type="text"
                className="login-input"
                placeholder="ton_pseudo"
                value={regUsername}
                onChange={e => setRegUsername(e.target.value)}
                autoComplete="username"
                maxLength={20}
                pattern="[a-zA-Z0-9_\-]{3,20}"
                title="3-20 caractères : lettres, chiffres, - ou _"
                required
              />
              <span className="login-input-counter">{regUsername.length}/20</span>
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="reg-password">Mot de passe</label>
              <div className="login-input-wrapper">
                <input
                  id="reg-password"
                  type={showRegPwd ? 'text' : 'password'}
                  className="login-input login-input--with-icon"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowRegPwd(p => !p)}
                  tabIndex={-1}
                  aria-label={showRegPwd ? 'Masquer' : 'Afficher'}
                >
                  <IconEye open={showRegPwd} />
                </button>
              </div>
              <PasswordStrength password={regPassword} />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="reg-confirm">Confirmer le mot de passe</label>
              <input
                id="reg-confirm"
                type="password"
                className={`login-input ${regConfirm && regConfirm !== regPassword ? 'login-input--error' : ''}`}
                placeholder="••••••••"
                value={regConfirm}
                onChange={e => setRegConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
              {regConfirm && regConfirm !== regPassword && (
                <span className="login-input-msg login-input-msg--error">
                  Les mots de passe ne correspondent pas
                </span>
              )}
            </div>

            {regError && (
              <div className="login-error" role="alert" id="register-error">{regError}</div>
            )}

            <button
              type="submit"
              className={`login-submit ${regLoading ? 'is-loading' : ''}`}
              id="register-submit-button"
              disabled={regLoading}
            >
              <IconLogin />
              {regLoading ? 'Création...' : 'Créer mon compte'}
            </button>

            <p className="auth-switch-hint">
              Déjà un compte ?{' '}
              <button type="button" className="auth-switch-link" onClick={() => setTab('login')}>
                Se connecter
              </button>
            </p>
          </form>
        )}

        <button
          className="login-back"
          id="login-back-button"
          onClick={() => navigate('/')}
        >
          ← Retour au lobby
        </button>
      </div>
    </div>
  )
}
