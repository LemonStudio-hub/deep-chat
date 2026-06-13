import { useState, useRef, useCallback, useEffect } from 'react'
import type { ChatMessage, DeepSeekModel, ConnectionState } from '@deep-chat/shared'
import { ChatSocket } from '../lib/api'

export interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  connectionState: ConnectionState
  sendMessage: (content: string, model: DeepSeekModel) => void
  stopGeneration: () => void
  clearMessages: () => void
  setMessages: (messages: ChatMessage[]) => void
  loadHistory: () => void
}

export function useChat(conversationId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const socketRef = useRef<ChatSocket | null>(null)
  const assistantBufferRef = useRef('')
  const conversationIdRef = useRef(conversationId)

  // Keep ref in sync
  conversationIdRef.current = conversationId

  // Create/reconnect socket when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      socketRef.current?.close()
      socketRef.current = null
      setConnectionState('disconnected')
      return
    }

    // If already connected to this conversation, reuse
    if (socketRef.current?.isConnected) {
      return
    }

    // Close old socket
    socketRef.current?.close()

    const socket = new ChatSocket(conversationId, {
      maxReconnects: 8,
      onConnectionStateChange: (state) => {
        setConnectionState(state)

        // When reconnected after a drop, reload history to resync
        if (state === 'connected' && socketRef.current) {
          // Small delay to let the connection stabilize
          setTimeout(() => {
            if (conversationIdRef.current === conversationId) {
              socketRef.current?.requestHistory({
                onChunk: () => {},
                onDone: () => {},
                onError: () => {},
                onHistory: (msgs) => setMessages(msgs),
              })
            }
          }, 100)
        }
      },
    })

    socketRef.current = socket

    return () => {
      // Cleanup on conversationId change (not on every render)
    }
  }, [conversationId])

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.close()
    }
  }, [])

  const loadHistory = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return

    socket.requestHistory({
      onChunk: () => {},
      onDone: () => {},
      onError: (err) => setError(err.message),
      onHistory: (msgs) => setMessages(msgs),
    })
  }, [])

  const sendMessage = useCallback(
    async (content: string, model: DeepSeekModel) => {
      if (!content.trim() || isLoading) return

      const socket = socketRef.current
      if (!socket) return

      setError(null)
      const userMessage: ChatMessage = { role: 'user', content: content.trim() }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)

      setIsLoading(true)
      assistantBufferRef.current = ''

      // Add empty assistant message that will be filled by streaming
      setMessages([...updatedMessages, { role: 'assistant', content: '' }])

      await socket.sendChat(content.trim(), model, {
        onChunk: (text) => {
          assistantBufferRef.current += text
          const buffered = assistantBufferRef.current
          setMessages([...updatedMessages, { role: 'assistant', content: buffered }])
        },
        onDone: () => {
          setIsLoading(false)
        },
        onError: (err) => {
          setError(err.message)
          setIsLoading(false)
          // Remove the empty assistant message on error
          setMessages(updatedMessages)
        },
      })
    },
    [messages, isLoading],
  )

  const stopGeneration = useCallback(() => {
    socketRef.current?.stop()
    setIsLoading(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    connectionState,
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
    loadHistory,
  }
}
