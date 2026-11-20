import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../../utils/config'
import type { SuspendedQuestion } from '../../types'
import { soundManager } from '../../utils/sound'
import './Admin.css'
import './AdminUsers.css'

const API = API_URL

const ALL_ADMIN_CATEGORIES = [
  'geographie',
  'histoire',
  'sciences',
  'cinema',
  'musique',
  'sport',
  'litterature',
  'gastronomie',
  'capitale',
  'drapeau',
  'warframe',
  'anime & manga',
]

/* ─── Types ─────────────────────────────────────────────────── */
interface ImportDetail {
  sheet: string
  inserted: number
  updated: number
  unchanged?: number
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
  status: 'inserted' | 'updated' | 'unchanged'
}

interface ImportResponse {
  success: boolean
  summary: {
    sheetsProcessed: number
    totalInserted: number
    totalUpdated: number
    totalUnchanged?: number
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [adminTab, setAdminTab] = useState<'bank' | 'suspended'>(() => {
    return searchParams.get('tab') === 'suspended' ? 'suspended' : 'bank'
  })

  // Synchronize adminTab when searchParams change externally
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'suspended' && adminTab !== 'suspended') {
      setAdminTab('suspended')
    }
  }, [searchParams, adminTab])

  const handleTabChange = (tab: 'bank' | 'suspended') => {
    setAdminTab(tab)
    if (tab === 'suspended') {
      setSearchParams({ tab: 'suspended' })
    } else {
      setSearchParams({})
    }
  }

  /* Suspended questions states */
  const [suspendedQuestions, setSuspendedQuestions] = useState<SuspendedQuestion[]>([])
  const [loadingSuspended, setLoadingSuspended] = useState(false)
  const [suspendedError, setSuspendedError] = useState<string | null>(null)
  const [suspendedSearch, setSuspendedSearch] = useState('')
  const [suspendedCategory, setSuspendedCategory] = useState<string>('all')
  const [suspendedDiff, setSuspendedDiff] = useState<string>('all')
  const [actionToast, setActionToast] = useState<string | null>(null)

  /* Edit suspended question modal states */
  const [editingQuestion, setEditingQuestion] = useState<SuspendedQuestion | null>(null)
  const [editForm, setEditForm] = useState({
    text: '',
    answer: '',
    acceptedAnswers: '',
    category: 'geographie',
    difficulty: 'moyen',
    unmuteOnSave: true,
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // Auto-dismiss action toast
  useEffect(() => {
    if (!actionToast) return
    const timer = setTimeout(() => setActionToast(null), 3500)
    return () => clearTimeout(timer)
  }, [actionToast])

  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsError, setStatsError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* Preview & Question Manager states */
  const [autoPreview, setAutoPreview] = useState(true)
  const [showVisualPreview, setShowVisualPreview] = useState(false)
  const [previewFilter, setPreviewFilter] = useState<'all' | 'inserted' | 'updated' | 'unchanged'>('all')
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewCategory, setPreviewCategory] = useState<string>('all')
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null)
  const [dbQuestions, setDbQuestions] = useState<ImportedQuestion[]>([])
  const [showDbQuestions, setShowDbQuestions] = useState(false)
  const [loadingDbQuestions, setLoadingDbQuestions] = useState(false)
  const [diffFilter, setDiffFilter] = useState<'all' | 'facile' | 'moyen' | 'difficile'>('all')
  const [showAvailableTags, setShowAvailableTags] = useState(false)
  const [adminTagSearch, setAdminTagSearch] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  /* Verify admin credentials */
  useEffect(() => {
    const userStr = localStorage.getItem('auth_user')
    const token = localStorage.getItem('auth_token')
    if (token && userStr) {
      try {
        const u = JSON.parse(userStr)
        setIsAdmin(Boolean(u?.isAdmin))
      } catch {
        setIsAdmin(false)
      }
    } else {
      setIsAdmin(false)
    }
    setAuthChecked(true)
  }, [])

  /* Fetch stats on mount if admin */
  useEffect(() => {
    if (isAdmin) {
      fetchStats()
    }
  }, [isAdmin])

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

  /* ── Suspended Questions Handlers ──────────────────────────── */
  const fetchSuspendedQuestions = useCallback(async () => {
    setLoadingSuspended(true)
    setSuspendedError(null)
    try {
      const res = await fetch(`${API}/admin/questions/muted`)
      if (res.ok) {
        const data = (await res.json()) as { questions?: SuspendedQuestion[] }
        setSuspendedQuestions(data.questions || [])
      } else {
        setSuspendedError('Impossible de charger les questions suspendues.')
      }
    } catch (err) {
      setSuspendedError(`Erreur réseau : ${String(err)}`)
    } finally {
      setLoadingSuspended(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Administration — Smik Party'
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchSuspendedQuestions()
    }
  }, [isAdmin, fetchSuspendedQuestions])

  const handleStartEdit = (q: SuspendedQuestion) => {
    setEditingQuestion(q)
    setEditForm({
      text: q.text,
      answer: q.answer,
      acceptedAnswers:
        q.acceptedAnswers && q.acceptedAnswers.length > 0
          ? q.acceptedAnswers.join(', ')
          : q.answer,
      category: q.category || 'geographie',
      difficulty: q.difficulty || 'moyen',
      unmuteOnSave: true,
    })
  }

  const handleCancelEdit = () => {
    setEditingQuestion(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingQuestion) return
    const trimmedText = editForm.text.trim()
    const trimmedAns = editForm.answer.trim()
    if (!trimmedText || !trimmedAns) {
      alert('Le texte de la question et la réponse officielle sont obligatoires.')
      return
    }

    setSavingEdit(true)
    try {
      const answersArr = editForm.acceptedAnswers
        .split(',')
        .map(a => a.trim())
        .filter(Boolean)
      if (!answersArr.includes(trimmedAns)) {
        answersArr.unshift(trimmedAns)
      }

      const res = await fetch(`${API}/admin/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmedText,
          answer: trimmedAns,
          acceptedAnswers: answersArr,
          category: editForm.category,
          difficulty: editForm.difficulty,
          unmute: editForm.unmuteOnSave,
        }),
      })

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errJson.error || `Erreur HTTP ${res.status}`)
      }

      const data = (await res.json()) as { message?: string }
      setActionToast(data.message || 'Question modifiée avec succès.')
      setEditingQuestion(null)
      await fetchSuspendedQuestions()
      await fetchStats()
    } catch (err) {
      alert(`Erreur lors de la modification : ${String(err)}`)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleUnmuteQuestion = async (q: SuspendedQuestion) => {
    try {
      const res = await fetch(`${API}/admin/questions/${q.id}/unmute`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { message?: string }
      setActionToast(data.message || 'Question réactivée dans les arènes !')
      setSuspendedQuestions(prev => prev.filter(item => item.id !== q.id))
      await fetchStats()
    } catch (err) {
      alert(`Impossible de réactiver la question : ${String(err)}`)
    }
  }

  const handleDeleteSuspendedQuestion = async (q: SuspendedQuestion) => {
    if (
      !window.confirm(
        `⚠️ Supprimer définitivement cette question ?\n"${q.text.slice(0, 60)}..."\nCette action est irréversible.`
      )
    ) {
      return
    }

    try {
      const res = await fetch(`${API}/admin/questions/${q.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setActionToast('Question supprimée définitivement.')
      setSuspendedQuestions(prev => prev.filter(item => item.id !== q.id))
      await fetchStats()
    } catch (err) {
      alert(`Impossible de supprimer la question : ${String(err)}`)
    }
  }

  const filteredSuspended = useMemo(() => {
    return suspendedQuestions.filter(q => {
      if (
        suspendedCategory !== 'all' &&
        q.category.toLowerCase() !== suspendedCategory.toLowerCase()
      ) {
        return false
      }
      if (
        suspendedDiff !== 'all' &&
        q.difficulty.toLowerCase() !== suspendedDiff.toLowerCase()
      ) {
        return false
      }
      if (suspendedSearch.trim()) {
        const searchLower = suspendedSearch.toLowerCase()
        const matchText = q.text.toLowerCase().includes(searchLower)
        const matchAns = q.answer.toLowerCase().includes(searchLower)
        const matchVar = q.acceptedAnswers?.some(a =>
          a.toLowerCase().includes(searchLower)
        )
        const matchReason = q.reason?.toLowerCase().includes(searchLower)
        if (!matchText && !matchAns && !matchVar && !matchReason) return false
      }
      return true
    })
  }, [suspendedQuestions, suspendedCategory, suspendedDiff, suspendedSearch])

  /* ── Database Question Manager Handlers ────────────────────── */
  async function handleToggleDbQuestions() {
    if (showDbQuestions) {
      setShowDbQuestions(false)
      return
    }
    setLoadingDbQuestions(true)
    try {
      const res = await fetch(`${API}/admin/questions`)
      if (res.ok) {
        const data = await res.json() as { total: number; questions: Array<{
          id: string
          text: string
          answer: string
          acceptedAnswers: string[]
          category: string
          difficulty: string
          imageUrl?: string | null
          tags: string[]
        }> }
        setDbQuestions(data.questions.map(q => ({
          ...q,
          status: 'inserted' as const,
        })))
        setShowDbQuestions(true)
        setShowVisualPreview(true)
      } else {
        alert('Impossible de charger les questions de la base.')
      }
    } catch (err) {
      alert(`Erreur : ${String(err)}`)
    } finally {
      setLoadingDbQuestions(false)
    }
  }

  async function handleDeleteCategory(category: string, count: number) {
    if (!window.confirm(`⚠️ ATTENTION : Voulez-vous vraiment supprimer la catégorie "${category}" et ses ${count} question(s) ?\nCette opération est irréversible.`)) {
      return
    }
    try {
      const res = await fetch(`${API}/admin/categories/${encodeURIComponent(category)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`)
      const data = await res.json() as { success: boolean; count?: number }
      alert(`Catégorie "${category}" supprimée (${data.count ?? count} question(s) effacée(s)).`)
      fetchStats()
      setResult(prev => prev ? {
        ...prev,
        importedQuestions: prev.importedQuestions?.filter(q => q.category.toLowerCase() !== category.toLowerCase())
      } : null)
      setDbQuestions(prev => prev.filter(q => q.category.toLowerCase() !== category.toLowerCase()))
    } catch (err) {
      alert(`Erreur lors de la suppression de la catégorie : ${String(err)}`)
    }
  }

  async function handleDeleteQuestion(id: string, text: string) {
    if (!window.confirm(`Supprimer définitivement la question suivante ?\n\n"${text}"`)) {
      return
    }
    try {
      const res = await fetch(`${API}/admin/questions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`)
      fetchStats()
      setResult(prev => prev ? {
        ...prev,
        importedQuestions: prev.importedQuestions?.filter(q => q.id !== id)
      } : null)
      setDbQuestions(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      alert(`Erreur lors de la suppression de la question : ${String(err)}`)
    }
  }

  /* ── File handlers ─────────────────────────────────────────── */
  const handleFile = useCallback((f: File) => {
    if (/\.(xlsx|xls|md|markdown|csv)$/i.test(f.name)) {
      setFile(f)
      setResult(null)
    } else {
      alert('Format invalide. Veuillez sélectionner un fichier .xlsx, .xls, .md ou .csv')
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

  async function handleDownloadExport(format: 'xlsx' | 'md' | 'csv') {
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
      a.download = format === 'md' ? 'smik_party_all_questions.md' : format === 'csv' ? 'smik_party_all_questions.csv' : 'smik_party_all_questions.xlsx'
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

  /* ── Difficulty Order Map (Strict: Easy, Normal, Hard) ──────── */
  const DIFF_ORDER: Record<string, number> = {
    facile: 1,
    easy: 1,
    moyen: 2,
    normal: 2,
    medium: 2,
    difficile: 3,
    hard: 3,
  }

  /* ── Stats grouped by category ─────────────────────────────── */
  const statsByCategory = stats?.breakdown.reduce<Record<string, { total: number; details: StatBreakdown[] }>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { total: 0, details: [] }
    acc[item.category].total += item.count
    acc[item.category].details.push(item)
    return acc
  }, {}) ?? {}

  // Guarantee that details are ALWAYS ordered: Easy, Normal, Hard
  Object.values(statsByCategory).forEach(cat => {
    cat.details.sort((a, b) => (DIFF_ORDER[a.difficulty.toLowerCase()] ?? 99) - (DIFF_ORDER[b.difficulty.toLowerCase()] ?? 99))
  })

  /* ── Filtered Questions for Visual Preview ─────────────────── */
  const rawList = showDbQuestions ? dbQuestions : (result?.importedQuestions ?? [])
  // Deduplicate questions by id to avoid duplicate cards and React key collision issues
  const activeQuestionsList = useMemo(() => {
    const seen = new Set<string>()
    return rawList.filter(q => {
      if (!q.id || seen.has(q.id)) return false
      seen.add(q.id)
      return true
    })
  }, [rawList])

  const availableCategories = useMemo(() => {
    const catsMap = new Map<string, string>()
    activeQuestionsList.forEach(q => {
      const trimmed = q.category.trim()
      const lower = trimmed.toLowerCase()
      if (!catsMap.has(lower)) {
        catsMap.set(lower, trimmed)
      }
    })
    return Array.from(catsMap.values())
  }, [activeQuestionsList])

  // Reset category filter if selected category is not in available categories
  useEffect(() => {
    if (previewCategory !== 'all' && !availableCategories.some(c => c.toLowerCase() === previewCategory.toLowerCase())) {
      setPreviewCategory('all')
    }
  }, [availableCategories, previewCategory])

  const filteredQuestions = useMemo(() => {
    return activeQuestionsList.filter(q => {
      if (!showDbQuestions) {
        if (previewFilter === 'inserted' && q.status !== 'inserted') return false
        if (previewFilter === 'updated' && q.status !== 'updated') return false
        if (previewFilter === 'unchanged' && q.status !== 'unchanged') return false
      }
      if (diffFilter !== 'all') {
        const d = q.difficulty.toLowerCase().trim()
        const normD = (d === 'facile' || d === 'easy') ? 'facile' : (d === 'moyen' || d === 'normal' || d === 'medium') ? 'moyen' : 'difficile'
        if (normD !== diffFilter) return false
      }
      if (previewCategory !== 'all' && q.category.trim().toLowerCase() !== previewCategory.trim().toLowerCase()) return false
      if (previewSearch.trim()) {
        const s = previewSearch.toLowerCase().trim()
        const matchText = q.text.toLowerCase().includes(s)
        const matchAns = q.answer.toLowerCase().includes(s)
        const matchCat = q.category.toLowerCase().includes(s)
        const matchTag = q.tags?.some(t => t.toLowerCase().includes(s))
        return matchText || matchAns || matchCat || matchTag
      }
      return true
    })
  }, [activeQuestionsList, showDbQuestions, previewFilter, diffFilter, previewCategory, previewSearch])

  /* ─── Render ─────────────────────────────────────────────────── */
  if (authChecked && !isAdmin) {
    return (
      <main className="admin-page">
        <header className="admin-header">
          <button
            className="admin-back-btn"
            onClick={() => navigate('/')}
            title="Retour au salon principal"
          >
            ← Retour au Lobby
          </button>
          <div className="admin-header-title-row">
            <div className="admin-header-icon">🔒</div>
            <div>
              <h1 className="admin-header-title">Espace Questions & Administration</h1>
              <p className="admin-header-sub">Banque de questions, import/export et modération</p>
            </div>
          </div>
        </header>

        <div className="admin-content" style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
          <div
            style={{
              background: 'var(--color-bg-card)',
              padding: '40px 32px',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: 'var(--color-text-primary)' }}>
              Accès Administrateur Requis
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Cet onglet est réservé à l'administration des questions, l'importation de fichiers Excel (.xlsx), CSV (.csv) ou Markdown (.md), et à la mise en sourdine. Veuillez vous connecter avec un compte administrateur pour gérer la base.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('/login')}
                style={{
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 0 16px var(--color-accent-glow)',
                }}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  padding: '10px 22px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  fontSize: 13,
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
              >
                Retour aux arènes
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

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
          <div className="admin-header-icon">{adminTab === 'bank' ? '📊' : '🔇'}</div>
          <div>
            <h1 className="admin-header-title">
              {adminTab === 'bank' ? 'Gestion des questions' : 'Questions Suspendues'}
            </h1>
            <p className="admin-header-sub">
              {adminTab === 'bank'
                ? 'Importez, exportez et gérez vos questions en Excel (.xlsx), CSV (.csv) ou Markdown (.md)'
                : 'Modérez, corrigez et réactivez les questions mises en sourdine par les administrateurs'}
            </p>
          </div>
        </div>

        {/* ── Primary Page Navigation Tabs (Questions vs Utilisateurs) ── */}
        <div className="admin-page-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={true}
            className="admin-page-tab-btn admin-page-tab-btn--active"
            onClick={() => {
              soundManager.playClick()
              navigate('/admin')
            }}
          >
            <span className="admin-page-tab-icon">❓</span>
            <span className="admin-page-tab-label">Questions</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="admin-page-tab-btn"
            onClick={() => {
              soundManager.playClick()
              navigate('/admin/users')
            }}
          >
            <span className="admin-page-tab-icon">👥</span>
            <span className="admin-page-tab-label">Utilisateurs</span>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="admin-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 'bank'}
            className={`admin-tab-btn ${adminTab === 'bank' ? 'admin-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('bank')}
          >
            <span className="admin-tab-icon">🗄️</span>
            <span className="admin-tab-label">Banque & Import / Export</span>
            {stats && <span className="admin-tab-count">{stats.total}</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={adminTab === 'suspended'}
            className={`admin-tab-btn ${adminTab === 'suspended' ? 'admin-tab-btn--active' : ''}`}
            onClick={() => handleTabChange('suspended')}
          >
            <span className="admin-tab-icon">🔇</span>
            <span className="admin-tab-label">Questions Suspendues</span>
            <span
              className={`admin-tab-badge ${
                suspendedQuestions.length > 0
                  ? 'admin-tab-badge--alert'
                  : 'admin-tab-badge--zero'
              }`}
            >
              {suspendedQuestions.length}
            </span>
          </button>
        </div>
      </header>

      <div className="admin-content">
        {adminTab === 'bank' && (
          <>
            {/* ── Database Stats ─────────────────────────────────── */}
        <section className="admin-card" aria-label="Statistiques base de données">
          <h2 className="admin-card-title">
            🗄️ Base de données
            {stats && <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>{stats.total} question{stats.total > 1 ? 's' : ''} au total</span>}
            {stats && stats.total > 0 && (
              <button
                type="button"
                className="btn-manage-db"
                onClick={handleToggleDbQuestions}
              >
                {loadingDbQuestions ? 'Chargement…' : showDbQuestions ? '✕ Fermer le gestionnaire' : '🔍 Gérer toutes les questions'}
              </button>
            )}
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
                  <div className="stats-item-header">
                    <span className="stats-item-cat">{CAT_EMOJI[cat] ?? '❓'} {cat}</span>
                    <button
                      type="button"
                      className="btn-delete-cat"
                      title={`Supprimer toute la catégorie "${cat}" et ses ${total} questions`}
                      onClick={() => handleDeleteCategory(cat, total)}
                    >
                      🗑️
                    </button>
                  </div>
                  <span className="stats-item-count">{total}</span>
                  <span className="stats-item-detail">
                    {details.map(d => {
                      const dLower = d.difficulty.toLowerCase()
                      const diffTag = (dLower === 'facile' || dLower === 'easy')
                        ? '🟢 Easy'
                        : (dLower === 'moyen' || dLower === 'normal' || dLower === 'medium')
                        ? '🟡 Normal'
                        : '🔴 Hard'
                      return `${diffTag}: ${d.count}`
                    }).join(' · ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {stats?.topTags && stats.topTags.length > 0 && (() => {
            const query = adminTagSearch.trim().toLowerCase()
            const filteredTags = stats.topTags.filter(t => !query || t.tag.toLowerCase().includes(query))
            return (
              <div className="admin-tags-section">
                <button
                  type="button"
                  className={`admin-tags-toggle-btn ${showAvailableTags ? 'is-open' : ''}`}
                  onClick={() => setShowAvailableTags(prev => !prev)}
                  aria-expanded={showAvailableTags}
                >
                  <span>🏷️ Tags disponibles ({stats.topTags.length})</span>
                  <span className="admin-tags-toggle-chevron">
                    {showAvailableTags ? '▲ Réduire' : '▼ Afficher'}
                  </span>
                </button>

                {showAvailableTags && (
                  <div className="admin-tags-panel fade-in">
                    {stats.topTags.length > 10 && (
                      <input
                        type="text"
                        className="admin-tags-search"
                        placeholder={`Filtrer parmi ${stats.topTags.length} tags...`}
                        value={adminTagSearch}
                        onChange={e => setAdminTagSearch(e.target.value)}
                      />
                    )}
                    <div className="admin-tags-cloud">
                      {filteredTags.length > 0 ? (
                        filteredTags.map(({ tag, count }) => (
                          <span key={tag} className="admin-tag-chip">
                            #{tag} <span className="admin-tag-chip-count">({count})</span>
                          </span>
                        ))
                      ) : (
                        <span className="admin-tags-empty">Aucun tag ne correspond à « {adminTagSearch} ».</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </section>

        {/* ── File Upload Section ────────────────────────────── */}
        <section className="admin-card" aria-label="Import de fichier Excel, CSV ou Markdown">
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
            <p className="drop-zone-label">Glissez votre fichier (.xlsx, .xls, .csv ou .md) ici</p>
            <p className="drop-zone-hint">ou cliquez pour parcourir</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.md,.markdown"
              onChange={onInputChange}
              aria-label="Sélectionner un fichier Excel, CSV ou Markdown"
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
              ✅ Import terminé — {result.summary.totalInserted} ajoutée{result.summary.totalInserted > 1 ? 's' : ''}, {result.summary.totalUpdated} mise{result.summary.totalUpdated > 1 ? 's' : ''} à jour{(result.summary.totalUnchanged ?? 0) > 0 ? `, ${result.summary.totalUnchanged} inchangée${result.summary.totalUnchanged! > 1 ? 's' : ''}` : ''}.
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

        {/* ── Visual Preview & Question Manager Section ──────────── */}
        {((result?.success && result.importedQuestions && result.importedQuestions.length > 0 && showVisualPreview) || showDbQuestions) && (
          <section className="admin-card" aria-label="Aperçu visuel et gestion des questions">
            <div className="preview-header-row">
              <div>
                <h2 className="admin-card-title">
                  {showDbQuestions ? '🗄️ Gestion des questions en base' : '👁️ Aperçu visuel des questions'}
                </h2>
                <p className="admin-header-sub">
                  {showDbQuestions
                    ? `${dbQuestions.length} question${dbQuestions.length > 1 ? 's' : ''} répertoriée${dbQuestions.length > 1 ? 's' : ''} en base`
                    : `${result?.importedQuestions?.length ?? 0} question${(result?.importedQuestions?.length ?? 0) > 1 ? 's' : ''} traitée${(result?.importedQuestions?.length ?? 0) > 1 ? 's' : ''} dans cette session`}
                </p>
              </div>
              <button
                type="button"
                className="btn-preview-close"
                onClick={() => {
                  setShowVisualPreview(false)
                  setShowDbQuestions(false)
                }}
                title="Fermer la liste"
              >
                ✕ Fermer
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

              {!showDbQuestions && result?.importedQuestions && (
                <div className="preview-filter-buttons">
                  <button
                    type="button"
                    className={`preview-filter-btn ${previewFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setPreviewFilter('all')}
                  >
                    Toutes ({activeQuestionsList.length})
                  </button>
                  <button
                    type="button"
                    className={`preview-filter-btn ${previewFilter === 'inserted' ? 'active' : ''}`}
                    onClick={() => setPreviewFilter('inserted')}
                  >
                    ✨ Ajoutées ({activeQuestionsList.filter(q => q.status === 'inserted').length})
                  </button>
                  <button
                    type="button"
                    className={`preview-filter-btn ${previewFilter === 'updated' ? 'active' : ''}`}
                    onClick={() => setPreviewFilter('updated')}
                  >
                    🔄 Mises à jour ({activeQuestionsList.filter(q => q.status === 'updated').length})
                  </button>
                  {activeQuestionsList.some(q => q.status === 'unchanged') && (
                    <button
                      type="button"
                      className={`preview-filter-btn ${previewFilter === 'unchanged' ? 'active' : ''}`}
                      onClick={() => setPreviewFilter('unchanged')}
                    >
                      💤 Inchangées ({activeQuestionsList.filter(q => q.status === 'unchanged').length})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Difficulty filter in strict order: Toutes, Easy, Normal, Hard */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Difficulté :</span>
              <button
                type="button"
                className={`preview-filter-btn ${diffFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDiffFilter('all')}
              >
                Toutes
              </button>
              <button
                type="button"
                className={`preview-filter-btn ${diffFilter === 'facile' ? 'active' : ''}`}
                onClick={() => setDiffFilter('facile')}
              >
                🟢 Easy
              </button>
              <button
                type="button"
                className={`preview-filter-btn ${diffFilter === 'moyen' ? 'active' : ''}`}
                onClick={() => setDiffFilter('moyen')}
              >
                🟡 Normal
              </button>
              <button
                type="button"
                className={`preview-filter-btn ${diffFilter === 'difficile' ? 'active' : ''}`}
                onClick={() => setDiffFilter('difficile')}
              >
                🔴 Hard
              </button>
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
              {filteredQuestions.map(q => {
                const dLower = q.difficulty.toLowerCase()
                const diffLabel = (dLower === 'facile' || dLower === 'easy')
                  ? '🟢 Easy'
                  : (dLower === 'moyen' || dLower === 'normal' || dLower === 'medium')
                  ? '🟡 Normal'
                  : '🔴 Hard'

                const cardClass = q.status === 'inserted'
                  ? 'preview-card--new'
                  : q.status === 'updated'
                  ? 'preview-card--updated'
                  : 'preview-card--unchanged'
                const statusLabel = q.status === 'inserted'
                  ? '✨ Ajoutée'
                  : q.status === 'updated'
                  ? '🔄 Mise à jour'
                  : '💤 Inchangée'

                return (
                  <div className={`preview-card ${cardClass}`} key={q.id}>
                    <div className="preview-card-top">
                      <span className="preview-cat-badge">
                        {CAT_EMOJI[q.category.toLowerCase()] ?? '🏷️'} {q.category}
                      </span>
                      {!showDbQuestions && (
                        <span className={`preview-status-pill ${q.status}`}>
                          {statusLabel}
                        </span>
                      )}
                      <span className={`preview-diff-pill ${q.difficulty}`}>
                        {diffLabel}
                      </span>
                      <button
                        type="button"
                        className="preview-card-delete-btn"
                        title="Supprimer cette question"
                        onClick={() => handleDeleteQuestion(q.id, q.text)}
                      >
                        🗑️
                      </button>
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
              )
            })}
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
              {(result.summary.totalUnchanged ?? 0) > 0 && (
                <div className="result-stat">
                  <div className="result-stat-number unchanged" style={{ color: '#94a3b8' }}>{result.summary.totalUnchanged}</div>
                  <div className="result-stat-label">Inchangées</div>
                </div>
              )}
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
                  {(d.unchanged ?? 0) > 0 && <span style={{ color: '#94a3b8' }}>={d.unchanged}</span>}
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
              id="btn-export-csv"
              onClick={() => handleDownloadExport('csv')}
              disabled={downloadingExport !== null}
              className="btn-export btn-export--csv"
            >
              <span>📋</span> {downloadingExport === 'csv' ? 'Export en cours…' : 'Télécharger en CSV (.csv)'}
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
                  <td><strong>catégorie</strong> (ou category)</td>
                  <td>geographie, histoire...</td>
                  <td><span className="optional">Optionnel (recommandé pour CSV multi-catégories)</span></td>
                </tr>
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

          <div style={{ marginTop: '1.5rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>
              📋 Exemple d'import via fichier CSV (.csv) :
            </p>
            <pre className="code-example-block">
{`catégorie,question,réponse,réponses_acceptées,difficulté,image_url,tag
geographie,"Quelle est la capitale de l'Allemagne ?",Berlin,berlin,facile,,Europe, Capitale
histoire,En quelle année débute la Révolution ?,1789,,facile,,France, Révolution
sciences,Quel est le symbole chimique de l'eau ?,H2O,h2o,facile,,Chimie`}
            </pre>
          </div>
        </section>
      </>
    )}

    {adminTab === 'suspended' && (
      <section className="admin-suspended-section" aria-label="Espace Questions Suspendues">
        {/* Banner */}
        <div className="admin-suspended-banner">
          <div className="admin-suspended-banner-icon">🔇</div>
          <div className="admin-suspended-banner-body">
            <h2 className="admin-suspended-banner-title">Questions Mises en Sourdine</h2>
            <p className="admin-suspended-banner-desc">
              Lorsqu'une question est mise en sourdine en jeu par un administrateur (via le bouton 🔇), elle est immédiatement retirée de la rotation des arènes pour ne pas pénaliser les joueurs.
              Corrigez les erreurs ou coquilles ci-dessous et réactivez la question en un clic.
            </p>
          </div>
          <button
            type="button"
            className="admin-suspended-refresh-btn"
            onClick={fetchSuspendedQuestions}
            disabled={loadingSuspended}
            title="Actualiser la liste"
          >
            {loadingSuspended ? 'Chargement…' : '🔄 Actualiser'}
          </button>
        </div>

        {/* Toolbar: Search & Filters */}
        <div className="admin-suspended-toolbar">
          <div className="admin-suspended-search-box">
            <span className="admin-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Rechercher une question, une réponse, ou un motif…"
              value={suspendedSearch}
              onChange={e => setSuspendedSearch(e.target.value)}
              className="admin-suspended-search-input"
            />
            {suspendedSearch && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() => setSuspendedSearch('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="admin-suspended-filters">
            <select
              value={suspendedCategory}
              onChange={e => setSuspendedCategory(e.target.value)}
              className="admin-suspended-select"
            >
              <option value="all">Toutes les catégories</option>
              {ALL_ADMIN_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {CAT_EMOJI[cat] ?? '❓'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={suspendedDiff}
              onChange={e => setSuspendedDiff(e.target.value)}
              className="admin-suspended-select"
            >
              <option value="all">Toutes difficultés</option>
              <option value="facile">🟢 Facile</option>
              <option value="moyen">🟡 Moyen</option>
              <option value="difficile">🔴 Difficile</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {suspendedError && (
          <div className="admin-suspended-error">
            ⚠️ {suspendedError}
          </div>
        )}

        {/* Loading or List */}
        {loadingSuspended ? (
          <div className="admin-suspended-loading">
            <p>Chargement des questions suspendues…</p>
          </div>
        ) : filteredSuspended.length === 0 ? (
          <div className="admin-suspended-empty">
            {suspendedQuestions.length === 0 ? (
              <>
                <div className="admin-empty-icon">🎉</div>
                <h3 className="admin-empty-title">Aucune question suspendue</h3>
                <p className="admin-empty-desc">
                  Toutes les questions sont actuellement actives et disponibles pour les parties dans les arènes.
                </p>
              </>
            ) : (
              <>
                <div className="admin-empty-icon">🔍</div>
                <h3 className="admin-empty-title">Aucun résultat</h3>
                <p className="admin-empty-desc">
                  Aucune question suspendue ne correspond à vos critères de recherche actuels.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="admin-suspended-list">
            {filteredSuspended.map(q => (
              <article key={q.id} className="admin-suspended-card" id={`suspended-card-${q.id}`}>
                <div className="admin-suspended-card-top">
                  <div className="admin-suspended-meta">
                    <span className="admin-meta-cat">
                      {CAT_EMOJI[q.category] ?? '❓'} {q.category}
                    </span>
                    <span className={`admin-meta-diff admin-meta-diff--${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                    {q.mutedAt && (
                      <span className="admin-meta-date">
                        🕒 {new Date(q.mutedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="admin-suspended-reason">
                    <span className="admin-reason-badge">
                      ⚠️ Motif : {q.reason || 'Signalée par un admin en direct'}
                    </span>
                  </div>
                </div>

                <div className="admin-suspended-card-body">
                  <p className="admin-suspended-question-text">{q.text}</p>

                  <div className="admin-suspended-answers-box">
                    <div className="admin-answer-item admin-answer-item--official">
                      <span className="admin-answer-label">Réponse officielle :</span>
                      <span className="admin-answer-value">{q.answer || '—'}</span>
                    </div>

                    {q.acceptedAnswers && q.acceptedAnswers.length > 0 && (
                      <div className="admin-answer-item admin-answer-item--variants">
                        <span className="admin-answer-label">Variantes acceptées :</span>
                        <div className="admin-answer-tags">
                          {q.acceptedAnswers.map((ans, idx) => (
                            <span key={idx} className="admin-answer-tag">{ans}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-suspended-card-actions">
                  <button
                    type="button"
                    className="admin-act-btn admin-act-btn--edit"
                    onClick={() => handleStartEdit(q)}
                    title="Modifier l'énoncé, la réponse ou les variantes"
                  >
                    ✏️ Corriger & Réactiver
                  </button>

                  <button
                    type="button"
                    className="admin-act-btn admin-act-btn--unmute"
                    onClick={() => handleUnmuteQuestion(q)}
                    title="Réactiver directement dans les arènes"
                  >
                    🔊 Réactiver (Unmute)
                  </button>

                  <button
                    type="button"
                    className="admin-act-btn admin-act-btn--delete"
                    onClick={() => handleDeleteSuspendedQuestion(q)}
                    title="Supprimer définitivement de la base"
                  >
                    🗑️ Supprimer
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    )}
  </div>

  {/* Edit Modal for Suspended Question */}
  {editingQuestion && (
    <div className="admin-modal-overlay" onClick={handleCancelEdit}>
      <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="admin-modal-title-group">
            <span className="admin-modal-icon">✏️</span>
            <div>
              <h3 className="admin-modal-title">Corriger la question suspendue</h3>
              <p className="admin-modal-subtitle">Modifiez le libellé, la réponse ou les variantes avant de la réactiver</p>
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={handleCancelEdit}>✕</button>
        </div>

        <form onSubmit={handleSaveEdit} className="admin-modal-form">
          <div className="admin-form-group">
            <label className="admin-form-label">Libellé de la question</label>
            <textarea
              rows={3}
              className="admin-form-textarea"
              value={editForm.text}
              onChange={e => setEditForm(prev => ({ ...prev, text: e.target.value }))}
              required
              placeholder="Écrivez le texte de la question..."
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label">Réponse exacte (officielle)</label>
              <input
                type="text"
                className="admin-form-input"
                value={editForm.answer}
                onChange={e => setEditForm(prev => ({ ...prev, answer: e.target.value }))}
                required
                placeholder="Ex: Paris"
              />
            </div>

            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label">Difficulté</label>
              <select
                className="admin-form-select"
                value={editForm.difficulty}
                onChange={e => setEditForm(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <option value="facile">🟢 Facile</option>
                <option value="moyen">🟡 Moyen</option>
                <option value="difficile">🔴 Difficile</option>
              </select>
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">
              Variantes acceptées
              <span className="admin-form-help"> (séparées par une virgule)</span>
            </label>
            <input
              type="text"
              className="admin-form-input"
              value={editForm.acceptedAnswers}
              onChange={e => setEditForm(prev => ({ ...prev, acceptedAnswers: e.target.value }))}
              placeholder="Ex: Paris, la ville lumière, ville de paris"
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Catégorie</label>
            <select
              className="admin-form-select"
              value={editForm.category}
              onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
            >
              {ALL_ADMIN_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {CAT_EMOJI[cat] ?? '❓'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-checkbox-row">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={editForm.unmuteOnSave}
                onChange={e => setEditForm(prev => ({ ...prev, unmuteOnSave: e.target.checked }))}
              />
              <span>Réactiver immédiatement dans les arènes (retirer de la sourdine)</span>
            </label>
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn-secondary" onClick={handleCancelEdit} disabled={savingEdit}>
              Annuler
            </button>
            <button type="submit" className="admin-btn-primary" disabled={savingEdit}>
              {savingEdit ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Floating Action Toast */}
  {actionToast && (
    <div className="admin-action-toast fade-in">
      <span>✨</span>
      <span>{actionToast}</span>
    </div>
  )}

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
