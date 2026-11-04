import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../../utils/config'
import './Admin.css'

const API = API_URL

/* ─── Types ─────────────────────────────────────────────────── */
interface ImportDetail {
  sheet: string
  inserted: number
  updated: number
  skipped: number
  errors: string[]
}

export interface ImportedQuestion {
  id: string
  text: string
  answer: string
  acceptedAnswers: string[]
  category: string
  difficulty: string
  imageUrl?: string | null
  tags: string[]
  status: 'inserted' | 'updated'
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
  importedQuestions?: ImportedQuestion[]
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
  topTags?: { tag: string; count: number }[]
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
  capitale: '🏛️',
  drapeau: '🚩',
  warframe: '⚔️',
  'anime & manga': '🎌',
}

/* ─── Format size ─────────────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  return `${(bytes / 1024).toFixed(1)} Ko`
}

/* ─── Component ──────────────────────────────────────────────── */
export default function Admin() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsError, setStatsError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Preview states */
  const [autoPreview, setAutoPreview] = useState(true)
  const [showVisualPreview, setShowVisualPreview] = useState(false)
  const [previewFilter, setPreviewFilter] = useState<'all' | 'inserted' | 'updated'>('all')
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewCategory, setPreviewCategory] = useState<string>('all')
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null)

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
    if (/\.(xlsx|xls|md|markdown)$/i.test(f.name)) {
      setFile(f)
      setResult(null)
    } else {
      alert('Format invalide. Veuillez sélectionner un fichier .xlsx, .xls ou .md')
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
        if (autoPreview && data.importedQuestions && data.importedQuestions.length > 0) {
          setShowVisualPreview(true)
        } else {
          setShowVisualPreview(false)
        }
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (err) {
      setResult({ success: false, summary: { sheetsProcessed: 0, totalInserted: 0, totalUpdated: 0, totalSkipped: 0 }, details: [], error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  /* ── Export handlers ────────────────────────────────────────── */
  const [downloadingExport, setDownloadingExport] = useState<string | null>(null)

  async function handleDownloadExport(format: 'xlsx' | 'md') {
    setDownloadingExport(format)
    try {
      const res = await fetch(`${API}/admin/export?format=${format}`)
      if (!res.ok) {
        throw new Error(`Erreur HTTP: ${res.status}`)
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'md' ? 'smik_party_all_questions.md' : 'smik_party_all_questions.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Impossible d'exporter les questions : ${String(err)}`)
    } finally {
      setDownloadingExport(null)
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch(`${API}/admin/template`)
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'smik_party_questions_template.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Impossible de télécharger le template : ${String(err)}`)
    }
  }

  /* ── Stats grouped by category ─────────────────────────────── */
  const statsByCategory = stats?.breakdown.reduce<Record<string, { total: number; details: StatBreakdown[] }>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { total: 0, details: [] }
    acc[item.category].total += item.count
    acc[item.category].details.push(item)
    return acc
  }, {}) ?? {}

  /* ── Filtered Questions for Visual Preview ─────────────────── */
  const importedList = result?.importedQuestions ?? []
  const availableCategories = Array.from(new Set(importedList.map(q => q.category)))

  const filteredQuestions = importedList.filter(q => {
    if (previewFilter === 'inserted' && q.status !== 'inserted') return false
    if (previewFilter === 'updated' && q.status !== 'updated') return false
    if (previewCategory !== 'all' && q.category.toLowerCase() !== previewCategory.toLowerCase()) return false
    if (previewSearch.trim()) {
      const s = previewSearch.toLowerCase()
      const matchText = q.text.toLowerCase().includes(s)
      const matchAns = q.answer.toLowerCase().includes(s)
      const matchCat = q.category.toLowerCase().includes(s)
      const matchTag = q.tags?.some(t => t.toLowerCase().includes(s))
      return matchText || matchAns || matchCat || matchTag
    }
    return true
  })

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <main className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <button
          className="admin-back-btn"
          onClick={() => navigate('/')}
          title="Retour au salon principal"
        >
          ← Retour au Lobby
        </button>
        <div className="admin-header-title-row">
          <div className="admin-header-icon">📊</div>
          <div>
            <h1 className="admin-header-title">Import de questions</h1>
            <p className="admin-header-sub">Ajoutez des questions via un fichier Excel — un onglet par catégorie</p>
          </div>
        </div>
      </header>

      <div className="admin-content">

        {/* ── Database Stats ─────────────────────────────────── */}
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
                    {details.map(d => {
                      const diffTag = d.difficulty === 'facile' ? '🟢 Easy' : d.difficulty === 'moyen' ? '🟡 Normal' : d.difficulty === 'difficile' ? '🔴 Hard' : d.difficulty
                      return `${diffTag}: ${d.count}`
                    }).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {stats?.topTags && stats.topTags.length > 0 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                🏷️ Tags disponibles ({stats.topTags.length}) :
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {stats.topTags.map(({ tag, count }) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 9px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      background: 'rgba(124, 58, 237, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#c4b5fd',
                    }}
                  >
                    #{tag} <span style={{ opacity: 0.7 }}>({count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── File Upload Section ────────────────────────────── */}
        <section className="admin-card" aria-label="Import de fichier Excel ou Markdown">
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
            <p className="drop-zone-label">Glissez votre fichier (.xlsx, .xls ou .md) ici</p>
            <p className="drop-zone-hint">ou cliquez pour parcourir</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.md,.markdown"
              onChange={onInputChange}
              aria-label="Sélectionner un fichier Excel ou Markdown"
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

          {/* Preview Option Toggle */}
          <div className="preview-toggle-wrapper">
            <label className="preview-toggle-label">
              <input
                type="checkbox"
                checked={autoPreview}
                onChange={e => setAutoPreview(e.target.checked)}
                className="preview-toggle-checkbox"
              />
              <span>Afficher automatiquement l'aperçu visuel des questions après l'import</span>
            </label>
          </div>

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

          {/* Prompt banner if preview was not shown automatically */}
          {result?.success && result.importedQuestions && result.importedQuestions.length > 0 && !showVisualPreview && (
            <div className="preview-prompt-banner">
              <span>👀 Souhaitez-vous afficher l'aperçu visuel des {result.importedQuestions.length} questions traitées ?</span>
              <button
                type="button"
                className="btn-preview-toggle"
                onClick={() => setShowVisualPreview(true)}
              >
                👁️ Oui, afficher l'aperçu
              </button>
            </div>
          )}
        </section>

        {/* ── Visual Preview Section ────────────────────────────── */}
        {result?.success && result.importedQuestions && result.importedQuestions.length > 0 && showVisualPreview && (
          <section className="admin-card" aria-label="Aperçu visuel des questions">
            <div className="preview-header-row">
              <div>
                <h2 className="admin-card-title">👁️ Aperçu visuel des questions</h2>
                <p className="admin-header-sub">
                  {result.importedQuestions.length} question{result.importedQuestions.length > 1 ? 's' : ''} traitée{result.importedQuestions.length > 1 ? 's' : ''} dans cette session
                </p>
              </div>
              <button
                type="button"
                className="btn-preview-close"
                onClick={() => setShowVisualPreview(false)}
                title="Masquer l'aperçu"
              >
                ✕ Masquer l'aperçu
              </button>
            </div>

            {/* Filter controls */}
            <div className="preview-filters-row">
              <input
                type="text"
                className="preview-search-input"
                placeholder="Rechercher par mot-clé, question, réponse ou tag..."
                value={previewSearch}
                onChange={e => setPreviewSearch(e.target.value)}
              />

              <div className="preview-filter-buttons">
                <button
                  type="button"
                  className={`preview-filter-btn ${previewFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setPreviewFilter('all')}
                >
                  Toutes ({result.importedQuestions.length})
                </button>
                <button
                  type="button"
                  className={`preview-filter-btn ${previewFilter === 'inserted' ? 'active' : ''}`}
                  onClick={() => setPreviewFilter('inserted')}
                >
                  ✨ Ajoutées ({result.importedQuestions.filter(q => q.status === 'inserted').length})
                </button>
                <button
                  type="button"
                  className={`preview-filter-btn ${previewFilter === 'updated' ? 'active' : ''}`}
                  onClick={() => setPreviewFilter('updated')}
                >
                  🔄 Mises à jour ({result.importedQuestions.filter(q => q.status === 'updated').length})
                </button>
              </div>
            </div>

            {/* Category quick filter */}
            {availableCategories.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  type="button"
                  className={`preview-filter-btn ${previewCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setPreviewCategory('all')}
                >
                  Toutes les catégories
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`preview-filter-btn ${previewCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                    onClick={() => setPreviewCategory(cat)}
                  >
                    {CAT_EMOJI[cat.toLowerCase()] ?? '🏷️'} {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Cards Grid */}
            <div className="preview-cards-grid">
              {filteredQuestions.map(q => (
                <div className={`preview-card ${q.status === 'inserted' ? 'preview-card--new' : 'preview-card--updated'}`} key={q.id}>
                  <div className="preview-card-top">
                    <span className="preview-cat-badge">
                      {CAT_EMOJI[q.category.toLowerCase()] ?? '🏷️'} {q.category}
                    </span>
                    <span className={`preview-status-pill ${q.status}`}>
                      {q.status === 'inserted' ? '✨ Ajoutée' : '🔄 Mise à jour'}
                    </span>
                    <span className={`preview-diff-pill ${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                  </div>

                  {q.imageUrl && (
                    <div
                      className="preview-img-wrapper"
                      onClick={() => setPreviewModalImage(q.imageUrl ?? null)}
                      title="Cliquer pour agrandir"
                    >
                      <img src={q.imageUrl} alt="Illustration de la question" className="preview-card-img" />
                      <span className="preview-img-zoom-hint">🔍 Zoom</span>
                    </div>
                  )}

                  <p className="preview-card-text">{q.text}</p>

                  <div className="preview-card-answer-box">
                    <span className="preview-answer-label">Réponse :</span>
                    <strong className="preview-answer-value">{q.answer}</strong>
                  </div>

                  {q.tags && q.tags.length > 0 && (
                    <div className="preview-card-tags">
                      {q.tags.map(t => (
                        <span key={t} className="preview-card-tag">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredQuestions.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0', fontStyle: 'italic' }}>
                Aucune question ne correspond à vos critères de recherche.
              </p>
            )}
          </section>
        )}

        {/* ── Results details ───────────────────────────────────── */}
        {result?.success && result.details.length > 0 && (
          <section className="admin-card" aria-label="Résultats par catégorie">
            <h2 className="admin-card-title">📊 Détails par catégorie</h2>

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
                  {CAT_EMOJI[d.sheet.toLowerCase()] ?? '📄'} {d.sheet}
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

        {/* ── Export All Questions Section (Admin Only) ─────────── */}
        <section className="admin-card" aria-label="Exportation complète de la base de données">
          <h2 className="admin-card-title">📦 Télécharger toutes les questions (Export Admin)</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
            Téléchargez l'intégralité du catalogue de questions actuellement en base de données ({stats?.total ?? 0} question{(stats?.total ?? 0) > 1 ? 's' : ''}) au format de votre choix :
          </p>

          <div className="export-buttons-row">
            <button
              type="button"
              id="btn-export-excel"
              onClick={() => handleDownloadExport('xlsx')}
              disabled={downloadingExport !== null}
              className="btn-export btn-export--excel"
            >
              <span>📊</span> {downloadingExport === 'xlsx' ? 'Export en cours…' : 'Télécharger en Excel (.xlsx)'}
            </button>
            <button
              type="button"
              id="btn-export-md"
              onClick={() => handleDownloadExport('md')}
              disabled={downloadingExport !== null}
              className="btn-export btn-export--md"
            >
              <span>📝</span> {downloadingExport === 'md' ? 'Export en cours…' : 'Télécharger en Markdown (.md)'}
            </button>
          </div>
        </section>

        {/* ── Template & Format ────────────────────────────────── */}
        <section className="admin-card" aria-label="Template et format du fichier">
          <h2 className="admin-card-title">📥 Template & Formats acceptés</h2>

          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
            Téléchargez le template Excel pré-configuré avec les 10 onglets et les exemples :
          </p>

          <button
            type="button"
            id="btn-download-template"
            onClick={handleDownloadTemplate}
            className="btn-template"
            style={{ cursor: 'pointer', border: 'none', textAlign: 'center' }}
          >
            ⬇️ Télécharger le template (.xlsx)
          </button>

          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', fontWeight: 500 }}>
              Colonnes attendues dans chaque tableau :
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
                  <td><strong>difficulté</strong></td>
                  <td>easy / normal / hard (ou facile / moyen / difficile)</td>
                  <td><span className="optional">Optionnel (défaut: easy)</span></td>
                </tr>
                <tr>
                  <td><strong>image_url</strong> (ou image)</td>
                  <td>https://... (URL de la photo/illustration de la question)</td>
                  <td><span className="optional">Optionnel</span></td>
                </tr>
                <tr>
                  <td><strong>tag</strong> (ou tags)</td>
                  <td>Europe, Capitale (séparés par des virgules)</td>
                  <td><span className="optional">Optionnel</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
              📝 Exemple d'import via fichier Markdown (.md) :
            </p>
            <pre className="code-example-block">
{`# geographie

| question | réponse | réponses_acceptées | difficulté | image_url | tag |
| --- | --- | --- | --- | --- | --- |
| Quelle est la capitale de l'Allemagne ? | Berlin | berlin | facile | | Europe, Capitale |
| Quel est ce célèbre monument ? | Tour Eiffel | eiffel | facile | https://... | France, Monument |

# histoire

| question | réponse | difficulté | tag |
| --- | --- | --- | --- |
| En quelle année débute la Révolution ? | 1789 | facile | France, Révolution |`}
            </pre>
          </div>
        </section>

      </div>

      {/* Image Modal Preview */}
      {previewModalImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '2rem',
          }}
          onClick={() => setPreviewModalImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={previewModalImage}
              alt="Agrandissement"
              style={{
                width: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            />
            <button
              type="button"
              onClick={() => setPreviewModalImage(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
