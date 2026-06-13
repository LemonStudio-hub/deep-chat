// ─── Message Types ───────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: MessageRole
  content: string
}

// ─── API Request / Response ──────────────────────────────────────────────────

export interface ChatRequest {
  messages: ChatMessage[]
  model?: DeepSeekModel
  temperature?: number
  maxTokens?: number
}

export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner'

export interface ChatResponse {
  id: string
  model: string
  message: ChatMessage
  usage: TokenUsage
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// ─── Streaming ───────────────────────────────────────────────────────────────

export interface StreamChunk {
  id: string
  object: string
  choices: StreamChoice[]
}

export interface StreamChoice {
  index: number
  delta: Partial<ChatMessage>
  finishReason: string | null
}

// ─── Conversation ────────────────────────────────────────────────────────────

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  model: DeepSeekModel
  createdAt: number
  updatedAt: number
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  error: {
    message: string
    type: string
    code?: string
  }
}
