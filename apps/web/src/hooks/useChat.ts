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
  // Generation counter — incremented on every conversation switch.
  // Callbacks from old generations are silently discarded.
  const generationRef = useRef(0)

  conversationIdRef.current = conversationId

  // ── Socket lifecycle on conversation switch ──────────────────────────────

  useEffect(() => {
    if (!conversationId) {
      socketRef.current?.close()
      socketRef.current = null
      setConnectionState('disconnected')
      setMessages([])
      setIsLoading(false)
      setError(null)
      return
    }

    // Bump generation — any in-flight callbacks from the previous conversation
    // will see a stale generation and discard themselves.
    generationRef.current++
    const myGeneration = generationRef.current

    // Close old socket (kills in-flight requests and their callbacks)
    socketRef.current?.close()
    socketRef.current = null
    setMessages([])
    setIsLoading(false)
    setError(null)

    const socket = new ChatSocket(conversationId, {
      maxReconnects: 8,
      onConnectionStateChange: (state) => {
        if (myGeneration !== generationRef.current) return
        setConnectionState(state)

        if (state === 'connected') {
          // Resync history after reconnect
          setTimeout(() => {
            if (myGeneration !== generationRef.current) return
            if (conversationIdRef.current !== conversationId) return
            socket.requestHistory({
              onChunk: () => {},
              onDone: () => {},
              onError: () => {},
              onHistory: (msgs) => {
                if (myGeneration !== generationRef.current) return
                setMessages(msgs)
              },
            })
          }, 100)
        }
      },
    })

    socketRef.current = socket
  }, [conversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.close()
    }
  }, [])

  // ── Actions ─────────────────────────────────────────────────────────────

  const loadHistory = useCallback(() => {
    const socket = socketRef.current
    const gen = generationRef.current
    if (!socket) return

    socket.requestHistory({
      onChunk: () => {},
      onDone: () => {},
      onError: (err) => {
        if (gen !== generationRef.current) return
        setError(err.message)
      },
      onHistory: (msgs) => {
        if (gen !== generationRef.current) return
        setMessages(msgs)
      },
    })
  }, [])

  const sendMessage = useCallback(
    async (content: string, model: DeepSeekModel) => {
      if (!content.trim() || isLoading) return

      const socket = socketRef.current
      if (!socket) return

      // Capture the generation at send time — all callbacks check this
      const gen = generationRef.current

      setError(null)
      const userMessage: ChatMessage = { role: 'user', content: content.trim() }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)

      setIsLoading(true)
      assistantBufferRef.current = ''

      // Empty assistant placeholder
      setMessages([...updatedMessages, { role: 'assistant', content: '' }])

      await socket.sendChat(content.trim(), model, {
        onChunk: (text) => {
          // Stale callback from a previous conversation — discard
          if (gen !== generationRef.current) return
          assistantBufferRef.current += text
          setMessages([...updatedMessages, { role: 'assistant', content: assistantBufferRef.current }])
        },
        onDone: () => {
          if (gen !== generationRef.current) return
          setIsLoading(false)
        },
        onError: (err) => {
          if (gen !== generationRef.current) return
          setError(err.message)
          setIsLoading(false)
          // Roll back to messages without the empty assistant placeholder
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
