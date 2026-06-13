import type { ConversationMeta } from '../lib/storage'
import { Plus, MessageSquare, Trash2, X, Pencil, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface Props {
  conversations: ConversationMeta[]
  activeId: string | null
  isLoading: boolean
  onNew: () => void
  onSwitch: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({
  conversations,
  activeId,
  isLoading,
  onNew,
  onSwitch,
  onDelete,
  onRename,
  isOpen,
  onClose,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.select()
    }
  }, [editingId])

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditValue(currentTitle)
  }

  const confirmRename = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue)
    }
    setEditingId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmRename()
    } else if (e.key === 'Escape') {
      cancelRename()
    }
  }

  return (
    <>
      {/* Mobile overlay with frosted glass */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface-1/95 backdrop-blur-xl border-r border-white/[0.04] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-violet/10 flex items-center justify-center">
              <Sparkles size={14} className="text-accent" />
            </div>
            <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">Conversations</h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* New chat button */}
        <div className="px-4 pb-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-accent/[0.08] text-accent hover:bg-accent/[0.12] hover:shadow-glow-sm transition-all duration-200 text-sm font-medium group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            New Chat
          </button>
        </div>

        {/* Gradient divider */}
        <div className="mx-4 divider-fade" />

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                <MessageSquare size={18} className="text-zinc-700" />
              </div>
              <p className="text-xs text-zinc-600">No conversations yet</p>
              <p className="text-[11px] text-zinc-700 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => {
                  if (editingId !== conv.id) {
                    onSwitch(conv.id)
                    onClose()
                  }
                }}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 relative ${
                  conv.id === activeId
                    ? 'bg-white/[0.06] text-white'
                    : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'
                }`}
              >
                {/* Active indicator bar */}
                {conv.id === activeId && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-gradient-to-b from-accent to-accent/50" />
                )}

                <MessageSquare
                  size={14}
                  className={`flex-shrink-0 ${conv.id === activeId ? 'text-accent/60' : 'opacity-40'}`}
                />

                {editingId === conv.id ? (
                  <input
                    ref={editRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={confirmRename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-surface-3 text-[13px] text-white px-2 py-0.5 rounded-lg border border-accent/40 outline-none focus:ring-1 focus:ring-accent/30 transition-shadow"
                    maxLength={100}
                  />
                ) : (
                  <span className="flex-1 text-[13px] truncate leading-tight">{conv.title}</span>
                )}

                {/* Streaming indicator */}
                {isLoading && conv.id === activeId && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent animate-glow-pulse" />
                )}

                {/* Action buttons */}
                {editingId !== conv.id && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(conv.id, conv.title)
                      }}
                      className="p-1 rounded-lg hover:bg-white/[0.06] text-zinc-600 hover:text-zinc-300 transition-all scale-95 group-hover:scale-100"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(conv.id)
                      }}
                      className="p-1 rounded-lg hover:bg-white/[0.06] text-zinc-600 hover:text-red-400 transition-all scale-95 group-hover:scale-100"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4">
          <div className="divider-fade mb-3" />
          <p className="text-[10px] text-zinc-700 text-center tracking-wide">
            Deep Chat · Powered by DeepSeek
          </p>
        </div>
      </aside>
    </>
  )
}
