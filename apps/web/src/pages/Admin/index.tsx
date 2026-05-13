import { useState, useCallback, useEffect, useRef } from 'react'
import './Admin.css'

const API = 'http://localhost:3000'

/* ─── Types ─────────────────────────────────────────────────── */
interface ImportDetail {
  sheet: string
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

interface ImportResponse {
  success: boolean
  summary: {
    sheetsProcessed: number
    totalInserted: number
    totalUpdated: number
    totalSkipped: number
  }
  details: ImportDetail[]
  error?: string
}

interface StatBreakdown {
  category: string
  difficulty: string
  count: number
}

interface StatsResponse {
  total: number
  breakdown: StatBreakdown[]
}

/* ─── Category emoji map ─────────────────────────────────────── */
const CAT_EMOJI: Record<string, string> = {
  geographie: '🌍',
  histoire: '📜',
  sciences: '🔬',
  cinema: '🎬',
  musique: '🎵',
  sport: '⚽',
  litterature: '📚',
  gastronomie: '🍽️',
}

/* ─── Format size ─────────────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  return `${(bytes / 1024).toFixed(1)} Ko`
}

/* ─── Component ──────────────────────────────────────────────── */
export default function Admin() {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsError, setStatsError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Fetch stats on mount */
  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch(`${API}/admin/stats`)
      if (res.ok) {
        const data = await res.json() as StatsResponse
        setStats(data)
      } else {
        setStatsError(true)
      }
    } catch {
      setStatsError(true)
    }
  }

  /* ── File handlers ─────────────────────────────────────────── */
  const handleFile = useCallback((f: File) => {
    if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
      setFile(f)
      setResult(null)
    } else {
      alert('Format invalide. Veuillez sélectionner un fichier .xlsx ou .xls')
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  /* ── Import ────────────────────────────────────────────────── */
  async function handleImport() {
    if (!file) return
    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API}/admin/import`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json() as ImportResponse
      setResult(data)

      if (data.success) {
        await fetchStats()
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (err) {
      setResult({ success: false, summary: { sheetsProcessed: 0, totalInserted: 0, totalUpdated: 0, totalSkipped: 0 }, details: [], error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  /* ── Stats grouped by category ─────────────────────────────── */
  const statsByCategory = stats?.breakdown.reduce<Record<string, { total: number; details: StatBreakdown[] }>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { total: 0, details: [] }
    acc[item.category].total += item.count
    acc[item.category].details.push(item)
    return acc
  }, {}) ?? {}

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <main className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-icon">📊</div>
        <div>
          <h1 className="admin-header-title">Import de questions</h1>
          <p className="admin-header-sub">Ajoutez des questions via un fichier Excel — un onglet par catégorie</p>
        </div>
      </header>

      <div className="admin-content">

        {/* ── Stats DB ─────────────────────────────────────────── */}
        <section className="admin-card" aria-label="Statistiques base de données">
          <h2 className="admin-card-title">
            🗄️ Base de données
            {stats && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>{stats.total} question{stats.total > 1 ? 's' : ''} au total</span>}
          </h2>

          {statsError ? (
            <p className="stats-empty">⚠️ Impossible de charger les stats — vérifiez que la DB est connectée.</p>
          ) : !stats ? (
            <p className="stats-empty">Chargement…</p>
          ) : stats.total === 0 ? (
            <p className="stats-empty">Aucune question en base. Importez votre premier fichier Excel !</p>
          ) : (
            <div className="stats-grid">
              {Object.entries(statsByCategory).map(([cat, { total, details }]) => (
                <div className="stats-item" key={cat}>
                  <span className="stats-item-cat">{CAT_EMOJI[cat] ?? '❓'} {cat}</span>
                  <span className="stats-item-count">{total}</span>
                  <span className="stats-item-detail">
                    {details.map(d => `${d.difficulty}: ${d.count}`).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Upload ───────────────────────────────────────────── */}
        <section className="admin-card" aria-label="Import de fichier Excel">
          <h2 className="admin-card-title">📂 Importer un fichier</h2>

          {/* Drop zone */}
          <div
            id="drop-zone"
            className={`drop-zone${dragOver ? ' drag-over' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="drop-zone-icon">📄</span>
            <p className="drop-zone-label">Glissez votre fichier .xlsx ici</p>
            <p className="drop-zone-hint">ou cliquez pour parcourir</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={onInputChange}
              aria-label="Sélectionner un fichier Excel"
            />
          </div>

          {/* File selected */}
          {file && (
            <div className="file-selected">
              <span className="file-selected-icon">📗</span>
              <div>
                <p className="file-selected-name">{file.name}</p>
                <p className="file-selected-size">{formatSize(file.size)}</p>
              </div>
              <button
                className="file-selected-remove"
                onClick={() => { setFile(null); setResult(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                aria-label="Retirer le fichier"
              >✕</button>
            </div>
          )}

          {/* Import button */}
          <button
            id="btn-import"
            className="btn-import"
            onClick={handleImport}
            disabled={!file || loading}
          >
            {loading
              ? <><div className="spinner" /> Importation en cours…</>
              : <><span>⬆️</span> Importer les questions</>
            }
          </button>

          {/* Result banner */}
          {result && !result.success && (
            <div className="alert-banner error">
              ❌ {result.error ?? 'Erreur lors de l\'import.'}
            </div>
          )}
          {result?.success && (
            <div className="alert-banner success">
              ✅ Import terminé — {result.summary.totalInserted} ajoutées, {result.summary.totalUpdated} mises à jour.
            </div>
          )}
        </section>

        {/* ── Results details ───────────────────────────────────── */}
        {result?.success && result.details.length > 0 && (
          <section className="admin-card" aria-label="Résultats par catégorie">
            <h2 className="admin-card-title">📊 Résultats par onglet</h2>

            <div className="result-summary">
              <div className="result-stat">
                <div className="result-stat-number inserted">{result.summary.totalInserted}</div>
                <div className="result-stat-label">Insérées</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-number updated">{result.summary.totalUpdated}</div>
                <div className="result-stat-label">Mises à jour</div>
              </div>
              <div className="result-stat">
                <div className="result-stat-number skipped">{result.summary.totalSkipped}</div>
                <div className="result-stat-label">Ignorées</div>
              </div>
            </div>

            {result.details.map(d => (
              <div className="sheet-row" key={d.sheet}>
                <span className="sheet-name">
                  {CAT_EMOJI[d.sheet] ?? '📄'} {d.sheet}
                </span>
                <span className="sheet-counts">
                  <span style={{ color: '#10b981' }}>+{d.inserted}</span>
                  <span style={{ color: '#6366f1' }}>↺{d.updated}</span>
                  {d.skipped > 0 && <span style={{ color: '#f59e0b' }}>⚠{d.skipped}</span>}
                </span>
                {d.errors.length > 0 && (
                  <ul className="error-list">
                    {d.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {/* ── Template & Format ────────────────────────────────── */}
        <section className="admin-card" aria-label="Template et format du fichier">
          <h2 className="admin-card-title">📥 Template & Format</h2>

          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Téléchargez le template Excel pré-configuré avec les 8 onglets et les exemples :
          </p>

          <a
            id="btn-download-template"
            href={`${API}/admin/template`}
            download="smik_party_questions_template.xlsx"
            className="btn-template"
          >
            ⬇️ Télécharger le template
          </a>

          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>
              Colonnes attendues dans chaque onglet :
            </p>
            <table className="format-table">
              <thead>
                <tr>
                  <th>Colonne</th>
                  <th>Exemple</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>question</strong></td>
                  <td>Quelle est la capitale de la France ?</td>
                  <td><span className="required">Requis</span></td>
                </tr>
                <tr>
                  <td><strong>réponse</strong></td>
                  <td>Paris</td>
                  <td><span className="required">Requis</span></td>
                </tr>
                <tr>
                  <td><strong>réponses_acceptées</strong></td>
                  <td>paris, Paris, la capitale</td>
                  <td><span className="optional">Optionnel</span></td>
                </tr>
                <tr>
                  <td><strong>indice</strong></td>
                  <td>Ville lumière</td>
                  <td><span className="optional">Optionnel</span></td>
                </tr>
                <tr>
                  <td><strong>difficulté</strong></td>
                  <td>facile / moyen / difficile</td>
                  <td><span className="optional">Optionnel (défaut: facile)</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1rem' }}>
            💡 Chaque <strong>onglet</strong> correspond à une catégorie (geographie, histoire, sciences, cinema, musique, sport, litterature, gastronomie).
            Le nom de l'onglet détermine la catégorie.
          </p>
        </section>

      </div>
    </main>
  )
}
