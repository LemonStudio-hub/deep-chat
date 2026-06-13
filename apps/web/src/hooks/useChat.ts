import { useState, useRef, useCallback } from 'react'
import type { ChatMessage, DeepSeekModel } from '@deep-chat/shared'
import { streamChat } from '../lib/api'

export interface UseChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, model: DeepSeekModel) => void
  stopGeneration: () => void
  clearMessages: () => void
  setMessages: (messages: ChatMessage[]) => void
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const assistantBufferRef = useRef('')

  const sendMessage = useCallback(
    async (content: string, model: DeepSeekModel) => {
      if (!content.trim() || isLoading) return

      setError(null)
      const userMessage: ChatMessage = { role: 'user', content: content.trim() }
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)

      setIsLoading(true)
      assistantBufferRef.current = ''

      const abortController = new AbortController()
      abortRef.current = abortController

      // Add empty assistant message that will be filled by streaming
      setMessages([...updatedMessages, { role: 'assistant', content: '' }])

      await streamChat(
        updatedMessages,
        model,
        {
          onChunk: (text) => {
            assistantBufferRef.current += text
            const buffered = assistantBufferRef.current
            setMessages([...updatedMessages, { role: 'assistant', content: buffered }])
          },
          onDone: () => {
            setIsLoading(false)
            abortRef.current = null
          },
          onError: (err) => {
            setError(err.message)
            setIsLoading(false)
            abortRef.current = null
            // Remove the empty assistant message on error
            setMessages(updatedMessages)
          },
        },
        abortController.signal,
      )
    },
    [messages, isLoading],
  )

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
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
  }
}
