import { useState, useEffect, useRef } from 'react'
import {
  IconX, IconTemplate, IconShare, IconCopy, IconCheck, IconTrash,
  IconLock, IconGlobe, IconTarget, IconClock, IconZap, IconInfinity,
  IconTrophy, IconUsers, IconAlertCircle
} from '../Icons'
import {
  fetchMyTemplates, fetchPublicTemplates, fetchTemplateByCode,
  createTemplate, deleteTemplate, cloneTemplate
} from '../../utils/templateApi'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '../../types'
import type { GameTemplate, GameSettings } from '../../types'
import './TemplateModal.css'

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  currentSettings?: GameSettings
  onApplyTemplate?: (settings: GameSettings, templateName: string) => void
  initialTab?: 'my' | 'public' | 'code' | 'save'
}

export default function TemplateModal({
  isOpen,
  onClose,
  currentSettings,
  onApplyTemplate,
  initialTab = 'my',
}: TemplateModalProps) {
  const [activeTab, setActiveTab] = useState<'my' | 'public' | 'code' | 'save'>(initialTab)
  
  // Data states
  const [myTemplates, setMyTemplates] = useState<GameTemplate[]>([])
  const [publicTemplates, setPublicTemplates] = useState<GameTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Save form
  const [saveName, setSaveName] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  const [saveIsPublic, setSaveIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Code search form
  const [inputCode, setInputCode] = useState('')
  const [searchedTemplate, setSearchedTemplate] = useState<GameTemplate | null>(null)
  const [isSearchingCode, setIsSearchingCode] = useState(false)

  // Sharing modal overlay inside template modal
  const [sharingTemplate, setSharingTemplate] = useState<GameTemplate | null>(null)
  const saveNameInputRef = useRef<HTMLInputElement>(null)
  const prevIsOpenRef = useRef(false)

  const token = localStorage.getItem('auth_token')
  const isConnected = Boolean(token)

  useEffect(() => {
    // Only reset tab and fetch templates when modal transitions from closed to open
    if (isOpen && !prevIsOpenRef.current) {
      setActiveTab(initialTab)
      setError('')
      setSuccessMsg('')
      loadTemplates()
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen, initialTab])

  // Focus title input when save tab becomes active
  useEffect(() => {
    if (isOpen && activeTab === 'save') {
      const timer = setTimeout(() => saveNameInputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, activeTab])

  const loadTemplates = async () => {
    setIsLoading(true)
    setError('')
    try {
      if (token) {
        const mine = await fetchMyTemplates(token).catch(() => [])
        setMyTemplates(mine)
      }
      const pubs = await fetchPublicTemplates().catch(() => [])
      setPublicTemplates(pubs)
    } catch {
      setError('Impossible de récupérer les modèles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(identifier)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const handleApply = (tpl: GameTemplate) => {
    if (!onApplyTemplate) return
    onApplyTemplate(tpl.settings, tpl.name)
    // Mark as used
    fetchTemplateByCode(tpl.shareCode, true).catch(() => {})
    onClose()
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Vous devez être connecté pour sauvegarder un modèle.')
      return
    }
    if (!currentSettings) {
      setError('Aucun paramètre à sauvegarder.')
      return
    }
    const trimmed = saveName.trim()
    if (!trimmed) {
      setError('Veuillez donner un nom au modèle.')
      return
    }

    setIsSaving(true)
    setError('')
    try {
      const created = await createTemplate(token, {
        name: trimmed,
        description: saveDescription.trim() || undefined,
        isPublic: saveIsPublic,
        settings: currentSettings,
      })
      setSuccessMsg(`Modèle "${created.name}" créé avec succès ! Code : ${created.shareCode}`)
      setSaveName('')
      setSaveDescription('')
      setSaveIsPublic(false)
      // Refresh list
      loadTemplates()
      setActiveTab('my')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde du modèle.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!token) return
    if (!window.confirm(`Supprimer définitivement le modèle "${name}" ?`)) return
    try {
      await deleteTemplate(token, id)
      setMyTemplates(prev => prev.filter(t => t.id !== id))
      setSuccessMsg(`Modèle "${name}" supprimé.`)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.')
    }
  }

  const handleClone = async (shareCode: string) => {
    if (!token) {
      setError('Connectez-vous pour cloner ce modèle dans votre compte.')
      return
    }
    try {
      const cloned = await cloneTemplate(token, shareCode)
      setSuccessMsg(`Modèle "${cloned.name}" ajouté à vos modèles !`)
      loadTemplates()
      setActiveTab('my')
    } catch (err: any) {
      setError(err.message || 'Erreur lors du clonage.')
    }
  }

  const handleSearchCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = inputCode.trim().toUpperCase()
    if (!code) return
    setIsSearchingCode(true)
    setError('')
    setSearchedTemplate(null)
    try {
      const tpl = await fetchTemplateByCode(code)
      setSearchedTemplate(tpl)
    } catch (err: any) {
      setError(err.message || 'Code de modèle invalide.')
    } finally {
      setIsSearchingCode(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay template-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card template-modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon"><IconTemplate /></div>
            <h2 className="modal-title">Modèles de partie (Templates)</h2>
          </div>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="template-alert template-alert--error fade-in">
            <IconAlertCircle /> {error}
          </div>
        )}
        {successMsg && (
          <div className="template-alert template-alert--success fade-in">
            <IconCheck /> {successMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="template-tabs-nav">
          <button
            type="button"
            className={`template-tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => { setActiveTab('my'); setError(''); setSuccessMsg('') }}
          >
            <IconTemplate /> Mes Modèles ({myTemplates.length})
          </button>
          <button
            type="button"
            className={`template-tab-btn ${activeTab === 'public' ? 'active' : ''}`}
            onClick={() => { setActiveTab('public'); setError(''); setSuccessMsg('') }}
          >
            <IconGlobe /> Catalogue Public ({publicTemplates.length})
          </button>
          <button
            type="button"
            className={`template-tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => { setActiveTab('code'); setError(''); setSuccessMsg('') }}
          >
            <IconShare /> Par Code
          </button>
          {currentSettings && (
            <button
              type="button"
              className={`template-tab-btn ${activeTab === 'save' ? 'active' : ''}`}
              onClick={() => { setActiveTab('save'); setError(''); setSuccessMsg('') }}
            >
              💾 Sauvegarder l'actuel
            </button>
          )}
        </div>

        {/* Content body */}
        <div className="template-modal-body">
          {/* TAB: MY TEMPLATES */}
          {activeTab === 'my' && (
            <div className="template-tab-pane fade-in">
              {!isConnected ? (
                <div className="template-empty-state">
                  <IconLock />
                  <h3>Connectez-vous pour gérer vos modèles</h3>
                  <p>La création et la sauvegarde de modèles personnels nécessitent un compte joueur.</p>
                </div>
              ) : isLoading ? (
                <div className="template-loading">Chargement de vos modèles...</div>
              ) : myTemplates.length === 0 ? (
                <div className="template-empty-state">
                  <IconTemplate />
                  <h3>Aucun modèle enregistré</h3>
                  <p>Configurez vos catégories et options dans le lobby, puis cliquez sur <strong>"Sauvegarder l'actuel"</strong>.</p>
                  {currentSettings && (
                    <button type="button" className="btn-create" onClick={() => setActiveTab('save')} style={{ marginTop: 12 }}>
                      Enregistrer la configuration actuelle
                    </button>
                  )}
                </div>
              ) : (
                <div className="template-cards-grid">
                  {myTemplates.map(tpl => (
                    <div key={tpl.id} className="template-item-card">
                      <div className="template-item-header">
                        <div className="template-item-title-box">
                          <h4 className="template-item-name">{tpl.name}</h4>
                          <span className={`template-badge ${tpl.isPublic ? 'badge--public' : 'badge--private'}`}>
                            {tpl.isPublic ? <><IconGlobe /> Public</> : <><IconLock /> Privé</>}
                          </span>
                        </div>
                        <div className="template-item-code-badge" onClick={() => handleCopy(tpl.shareCode, tpl.id)} title="Cliquer pour copier le code">
                          {copiedCode === tpl.id ? <><IconCheck /> Copié !</> : <><IconCopy /> {tpl.shareCode}</>}
                        </div>
                      </div>

                      {tpl.description && <p className="template-item-desc">{tpl.description}</p>}

                      {/* Settings Pills Preview */}
                      <div className="template-settings-pills">
                        <span className="setting-pill"><IconClock /> {tpl.settings.timePerRound ?? 20}s</span>
                        <span className="setting-pill">
                          {tpl.settings.infiniteRounds ? <><IconInfinity /> Infini</> : <><IconZap /> {tpl.settings.roundCount ?? 10} manches</>}
                        </span>
                        <span className="setting-pill"><IconTrophy /> {tpl.settings.maxPoints ?? 1000} pts</span>
                        {tpl.settings.maxPlayers ? <span className="setting-pill"><IconUsers /> Max {tpl.settings.maxPlayers}</span> : null}
                      </div>

                      {/* Categories Preview */}
                      <div className="template-cats-preview">
                        {(tpl.settings.categories ?? []).map(cat => (
                          <span key={cat} className="template-cat-tag" title={CATEGORY_LABELS[cat] || cat}>
                            {CATEGORY_ICONS[cat] || '🏷️'} {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>

                      {/* Card Actions */}
                      <div className="template-card-actions">
                        {onApplyTemplate && (
                          <button
                            type="button"
                            className="btn-tpl-apply"
                            onClick={() => handleApply(tpl)}
                          >
                            <IconCheck /> Appliquer
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-tpl-action"
                          onClick={() => setSharingTemplate(tpl)}
                          title="Partager ce modèle"
                        >
                          <IconShare /> Partager
                        </button>
                        <button
                          type="button"
                          className="btn-tpl-action btn-tpl-danger"
                          onClick={() => handleDelete(tpl.id, tpl.name)}
                          title="Supprimer ce modèle"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PUBLIC CATALOG */}
          {activeTab === 'public' && (
            <div className="template-tab-pane fade-in">
              {isLoading ? (
                <div className="template-loading">Chargement du catalogue...</div>
              ) : publicTemplates.length === 0 ? (
                <div className="template-empty-state">
                  <IconGlobe />
                  <h3>Aucun modèle public pour le moment</h3>
                  <p>Soyez le premier à partager votre modèle avec la communauté !</p>
                </div>
              ) : (
                <div className="template-cards-grid">
                  {publicTemplates.map(tpl => (
                    <div key={tpl.id} className="template-item-card">
                      <div className="template-item-header">
                        <div className="template-item-title-box">
                          <h4 className="template-item-name">{tpl.name}</h4>
                          <span className="template-author-badge">
                            Par {tpl.user?.displayName || 'Joueur'}
                          </span>
                        </div>
                        <div className="template-item-code-badge" onClick={() => handleCopy(tpl.shareCode, tpl.id)} title="Cliquer pour copier le code">
                          {copiedCode === tpl.id ? <><IconCheck /> Copié !</> : <><IconCopy /> {tpl.shareCode}</>}
                        </div>
                      </div>

                      {tpl.description && <p className="template-item-desc">{tpl.description}</p>}

                      <div className="template-settings-pills">
                        <span className="setting-pill"><IconClock /> {tpl.settings.timePerRound ?? 20}s</span>
                        <span className="setting-pill">
                          {tpl.settings.infiniteRounds ? <><IconInfinity /> Infini</> : <><IconZap /> {tpl.settings.roundCount ?? 10} manches</>}
                        </span>
                        <span className="setting-pill"><IconTrophy /> {tpl.settings.maxPoints ?? 1000} pts</span>
                        <span className="setting-pill badge--usage">🔥 {tpl.usageCount ?? 0} parties</span>
                      </div>

                      <div className="template-cats-preview">
                        {(tpl.settings.categories ?? []).map(cat => (
                          <span key={cat} className="template-cat-tag">
                            {CATEGORY_ICONS[cat] || '🏷️'} {CATEGORY_LABELS[cat] || cat}
                          </span>
                        ))}
                      </div>

                      <div className="template-card-actions">
                        {onApplyTemplate && (
                          <button
                            type="button"
                            className="btn-tpl-apply"
                            onClick={() => handleApply(tpl)}
                          >
                            <IconCheck /> Appliquer
                          </button>
                        )}
                        {isConnected && (
                          <button
                            type="button"
                            className="btn-tpl-action"
                            onClick={() => handleClone(tpl.shareCode)}
                            title="Cloner dans mes modèles"
                          >
                            <IconTemplate /> Cloner
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-tpl-action"
                          onClick={() => setSharingTemplate(tpl)}
                          title="Partager"
                        >
                          <IconShare />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: IMPORT BY CODE */}
          {activeTab === 'code' && (
            <div className="template-tab-pane fade-in">
              <form className="template-code-search-bar" onSubmit={handleSearchCode}>
                <input
                  type="text"
                  placeholder="Ex: TMPL-7X2A"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  className="modal-input template-code-input"
                  maxLength={12}
                />
                <button type="submit" className="btn-create" disabled={isSearchingCode || !inputCode.trim()}>
                  {isSearchingCode ? 'Recherche...' : 'Charger le modèle'}
                </button>
              </form>

              {searchedTemplate && (
                <div className="template-item-card template-searched-preview fade-in">
                  <div className="template-item-header">
                    <div>
                      <h4 className="template-item-name">{searchedTemplate.name}</h4>
                      <span className="template-author-badge">
                        Créé par {searchedTemplate.user?.displayName || 'Joueur'}
                      </span>
                    </div>
                    <span className="template-item-code-badge">{searchedTemplate.shareCode}</span>
                  </div>

                  {searchedTemplate.description && (
                    <p className="template-item-desc">{searchedTemplate.description}</p>
                  )}

                  <div className="template-settings-pills">
                    <span className="setting-pill"><IconClock /> {searchedTemplate.settings.timePerRound ?? 20}s</span>
                    <span className="setting-pill">
                      {searchedTemplate.settings.infiniteRounds ? <><IconInfinity /> Infini</> : <><IconZap /> {searchedTemplate.settings.roundCount ?? 10} manches</>}
                    </span>
                    <span className="setting-pill"><IconTrophy /> {searchedTemplate.settings.maxPoints ?? 1000} pts</span>
                  </div>

                  <div className="template-cats-preview">
                    {(searchedTemplate.settings.categories ?? []).map(cat => (
                      <span key={cat} className="template-cat-tag">
                        {CATEGORY_ICONS[cat] || '🏷️'} {CATEGORY_LABELS[cat] || cat}
                      </span>
                    ))}
                  </div>

                  <div className="template-card-actions" style={{ marginTop: 14 }}>
                    {onApplyTemplate && (
                      <button
                        type="button"
                        className="btn-tpl-apply"
                        onClick={() => handleApply(searchedTemplate)}
                      >
                        <IconCheck /> Appliquer cette configuration
                      </button>
                    )}
                    {isConnected && (
                      <button
                        type="button"
                        className="btn-tpl-action"
                        onClick={() => handleClone(searchedTemplate.shareCode)}
                      >
                        <IconTemplate /> Ajouter à mes modèles
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SAVE CURRENT CONFIG */}
          {activeTab === 'save' && currentSettings && (
            <div className="template-tab-pane fade-in">
              {!isConnected ? (
                <div className="template-empty-state">
                  <IconLock />
                  <h3>Connexion requise</h3>
                  <p>Veuillez vous connecter pour enregistrer ce modèle sur votre compte.</p>
                </div>
              ) : (
                <form className="template-save-form" onSubmit={handleSave}>
                  <div className="modal-field">
                    <label className="modal-label">Nom du modèle *</label>
                    <input
                      ref={saveNameInputRef}
                      type="text"
                      className="modal-input"
                      placeholder="Ex: Culture Express 15s"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      maxLength={50}
                      required
                    />
                  </div>

                  <div className="modal-field">
                    <label className="modal-label">Description (optionnelle)</label>
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="Ex: Parties rapides sur la Géographie et les Sciences"
                      value={saveDescription}
                      onChange={e => setSaveDescription(e.target.value)}
                      maxLength={120}
                    />
                  </div>

                  <div className="modal-field template-toggle-row">
                    <label className="modal-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={saveIsPublic}
                        onChange={e => setSaveIsPublic(e.target.checked)}
                        style={{ marginRight: 8, cursor: 'pointer' }}
                      />
                      Partager publiquement dans le catalogue de la communauté
                    </label>
                  </div>

                  {/* Summary of current settings */}
                  <div className="template-save-preview">
                    <h5 className="preview-heading"><IconTarget /> Paramètres inclus :</h5>
                    <div className="template-settings-pills">
                      <span className="setting-pill"><IconClock /> {currentSettings.timePerRound}s</span>
                      <span className="setting-pill">
                        {currentSettings.infiniteRounds ? <><IconInfinity /> Infini</> : <><IconZap /> {currentSettings.roundCount} manches</>}
                      </span>
                      <span className="setting-pill"><IconTrophy /> {currentSettings.maxPoints} pts</span>
                      <span className="setting-pill"><IconTarget /> {currentSettings.categories.length} catégories</span>
                    </div>
                  </div>

                  <button type="submit" className="btn-create" disabled={isSaving || !saveName.trim()} style={{ width: '100%', justifyContent: 'center', marginTop: 12 }}>
                    {isSaving ? 'Enregistrement...' : '💾 Sauvegarder dans mes modèles'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Share Dialog Overlay */}
        {sharingTemplate && (
          <div className="template-share-overlay fade-in">
            <div className="template-share-dialog">
              <div className="template-share-header">
                <h3><IconShare /> Partager "{sharingTemplate.name}"</h3>
                <button className="modal-close" onClick={() => setSharingTemplate(null)}><IconX /></button>
              </div>

              <p className="share-instruction">
                Donnez ce code ou ce lien à vos amis pour qu'ils puissent charger votre configuration de partie exacte !
              </p>

              <div className="share-block">
                <label className="share-label">Code de partage unique :</label>
                <div className="share-field-row">
                  <span className="share-code-text">{sharingTemplate.shareCode}</span>
                  <button
                    type="button"
                    className="btn-copy"
                    onClick={() => handleCopy(sharingTemplate.shareCode, 'share-code')}
                  >
                    {copiedCode === 'share-code' ? <><IconCheck /> Copié !</> : <><IconCopy /> Copier le code</>}
                  </button>
                </div>
              </div>

              <div className="share-block">
                <label className="share-label">Lien direct d'invitation :</label>
                <div className="share-field-row">
                  <input
                    type="text"
                    readOnly
                    className="modal-input share-url-input"
                    value={`${window.location.origin}/?template=${sharingTemplate.shareCode}`}
                  />
                  <button
                    type="button"
                    className="btn-copy"
                    onClick={() => handleCopy(`${window.location.origin}/?template=${sharingTemplate.shareCode}`, 'share-url')}
                  >
                    {copiedCode === 'share-url' ? <><IconCheck /> Copié !</> : <><IconCopy /> Copier le lien</>}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="btn-create"
                onClick={() => setSharingTemplate(null)}
                style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
              >
                Terminé
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

