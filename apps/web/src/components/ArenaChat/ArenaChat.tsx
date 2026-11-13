import React, { useState, useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types'
import { IconMessageCircle, IconX, IconSend } from '../Icons'
import './ArenaChat.css'

export interface ArenaChatProps {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  selfId: string
  selfName: string
  /** Optional custom button trigger from outside (e.g. sidebar or topbar) */
  isOpenExternal?: boolean
  onToggleExternal?: () => void
}

function getPlayerColor(str: string): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#10b981', '#14b8a6', '#06b6d4', '#f59e0b',
    '#3b82f6', '#10b981', '#84cc16'
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const QUICK_REACTIONS = ['👏 GG', '🔥 Trop fort', '😂', '😮 Presque !', '🤔 Bien joué', '👋 Salut']

export default function ArenaChat({
  messages,
  onSendMessage,
  selfId,
  selfName: _selfName,
  isOpenExternal,
  onToggleExternal,
}: ArenaChatProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false)
  const isChatOpen = isOpenExternal !== undefined ? isOpenExternal : isOpenInternal
  const toggleChat = onToggleExternal || (() => setIsOpenInternal(prev => !prev))

  const [inputText, setInputText] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [previewMessage, setPreviewMessage] = useState<ChatMessage | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(messages.length)
  const previewTimerRef = useRef<any>(null)

  // Track unread messages and ephemeral preview when chat is closed
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const newMessages = messages.slice(prevCountRef.current)
      const lastMsg = newMessages[newMessages.length - 1]

      if (!isChatOpen) {
        // Count unread from others
        const newOthers = newMessages.filter(m => m.playerId !== selfId)
        if (newOthers.length > 0) {
          setUnreadCount(prev => prev + newOthers.length)
        }

        // Show toast preview for the latest message if not sent by self
        if (lastMsg && lastMsg.playerId !== selfId) {
          setPreviewMessage(lastMsg)
          if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
          previewTimerRef.current = setTimeout(() => {
            setPreviewMessage(null)
          }, 4500)
        }
      }
    }
    prevCountRef.current = messages.length
  }, [messages, isChatOpen, selfId])

  // Reset unread count when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0)
      setPreviewMessage(null)
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [isChatOpen])

  // Auto-scroll on new message
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isChatOpen])

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return
    onSendMessage(trimmed)
    setInputText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickReaction = (reaction: string) => {
    onSendMessage(reaction)
  }

  return (
    <aside className="arena-chat-container" aria-label="Chat de l'arène">
      {/* Ephemeral preview toast when closed */}
      {!isChatOpen && previewMessage && (
        <div
          className="arena-chat-preview-toast fade-in"
          onClick={() => toggleChat()}
          title="Cliquer pour ouvrir le chat"
        >
          <div className="chat-preview-author">
            <span
              className="chat-preview-dot"
              style={{ backgroundColor: getPlayerColor(previewMessage.playerName) }}
            />
            <strong>{previewMessage.playerName}</strong>
          </div>
          <div className="chat-preview-text">{previewMessage.text}</div>
        </div>
      )}

      {/* Floating Chat Trigger Button */}
      {!isChatOpen && (
        <button
          type="button"
          className={`arena-chat-fab ${unreadCount > 0 ? 'arena-chat-fab--unread' : ''}`}
          onClick={() => toggleChat()}
          id="btn-toggle-arena-chat"
          title="Ouvrir le chat de l'arène"
        >
          <IconMessageCircle />
          <span className="arena-chat-fab-label">Chat</span>
          {unreadCount > 0 && (
            <span className="arena-chat-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      )}

      {/* Chat Window Panel */}
      {isChatOpen && (
        <div className="arena-chat-window fade-in" id="arena-chat-window">
          {/* Header */}
          <div className="arena-chat-header">
            <div className="arena-chat-title-group">
              <span className="arena-chat-title-icon"><IconMessageCircle /></span>
              <span className="arena-chat-title">Chat de l'arène</span>
              <span className="arena-chat-count">{messages.length}</span>
            </div>
            <button
              type="button"
              className="arena-chat-close-btn"
              onClick={() => toggleChat()}
              title="Fermer le chat"
            >
              <IconX />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="arena-chat-messages" id="arena-chat-messages-list">
            {messages.length === 0 ? (
              <div className="arena-chat-empty">
                <p>💬 Aucun message pour le moment.</p>
                <span>Envoyez un message à tous les joueurs de l'arène !</span>
              </div>
            ) : (
              messages.map(msg => {
                const isSelf = msg.playerId === selfId
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="arena-chat-msg arena-chat-msg--system">
                      <span className="arena-chat-system-text">{msg.text}</span>
                    </div>
                  )
                }

                return (
                  <div
                    key={msg.id}
                    className={`arena-chat-msg ${isSelf ? 'arena-chat-msg--self' : ''}`}
                  >
                    {!isSelf && (
                      <div
                        className="arena-chat-avatar"
                        style={{ backgroundColor: getPlayerColor(msg.playerName) }}
                      >
                        {msg.playerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="arena-chat-content">
                      <div className="arena-chat-meta">
                        <span className="arena-chat-author">
                          {msg.playerName}
                          {isSelf && <span className="arena-chat-self-tag">Vous</span>}
                        </span>
                        <span className="arena-chat-time">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className="arena-chat-bubble">
                        {msg.text}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reactions Bar */}
          <div className="arena-chat-quick-reactions">
            {QUICK_REACTIONS.map(reaction => (
              <button
                key={reaction}
                type="button"
                className="chat-quick-pill"
                onClick={() => handleQuickReaction(reaction)}
                title={`Envoyer "${reaction}"`}
              >
                {reaction}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="arena-chat-input-row">
            <input
              type="text"
              className="arena-chat-input"
              placeholder="Écrire un message..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={150}
              id="arena-chat-input-field"
            />
            {inputText.length > 100 && (
              <span className="arena-chat-char-counter">{inputText.length}/150</span>
            )}
            <button
              type="button"
              className="arena-chat-send-btn"
              onClick={handleSend}
              disabled={!inputText.trim()}
              title="Envoyer (Entrée)"
              id="arena-chat-send-button"
            >
              <IconSend />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

