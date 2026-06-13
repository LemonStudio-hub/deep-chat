import { useState, useRef, useCallback, useEffect } from 'react'
import type { ChatMessage, DeepSeekModel } from '@deep-chat/shared'
import { ChatSocket } from '../lib/api'

export interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
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
  const socketRef = useRef<ChatSocket | null>(null)
  const assistantBufferRef = useRef('')

  // Create/reconnect socket when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      socketRef.current?.close()
      socketRef.current = null
      return
    }

    // Reuse existing socket for same conversation
    if (socketRef.current && socketRef.current.isConnected) {
      // Already connected to this conversation — nothing to do
      return
    }

    socketRef.current?.close()
    socketRef.current = new ChatSocket(conversationId)

    return () => {
      // Don't close on every render — only on unmount or conversationId change
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
    sendMessage,
    stopGeneration,
    clearMessages,
    setMessages,
    loadHistory,
  }
}
