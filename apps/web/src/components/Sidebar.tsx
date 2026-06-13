import type { ConversationMeta } from '../lib/storage'
import { Plus, MessageSquare, Trash2, X, Pencil } from 'lucide-react'
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
      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-surface-1 border-r border-white/5 flex flex-col transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Conversations</h2>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-white/10 text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/10 text-accent hover:bg-accent/15 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">No conversations yet</p>
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
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                  conv.id === activeId ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <MessageSquare size={14} className="flex-shrink-0 opacity-50" />

                {editingId === conv.id ? (
                  <input
                    ref={editRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={confirmRename}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-surface-3 text-sm text-white px-2 py-0.5 rounded border border-accent/40 outline-none"
                    maxLength={100}
                  />
                ) : (
                  <span className="flex-1 text-sm truncate">{conv.title}</span>
                )}

                {/* Streaming indicator */}
                {isLoading && conv.id === activeId && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                )}

                {/* Action buttons */}
                {editingId !== conv.id && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(conv.id, conv.title)
                      }}
                      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-all"
                      title="Rename"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(conv.id)
                      }}
                      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-red-400 transition-all"
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
        <div className="p-4 border-t border-white/5">
          <p className="text-[10px] text-gray-600 text-center">Deep Chat · Powered by DeepSeek</p>
        </div>
      </aside>
    </>
  )
}
