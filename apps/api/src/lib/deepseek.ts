import type { ChatMessage, DeepSeekModel } from '@deep-chat/shared'
import type { Env } from '../types'

interface DeepSeekRequest {
  model: string
  messages: ChatMessage[]
  stream: boolean
  temperature?: number
  max_tokens?: number
}

export async function streamChatCompletion(
  env: Env,
  messages: ChatMessage[],
  model?: DeepSeekModel,
  temperature?: number,
  maxTokens?: number,
): Promise<Response> {
  const body: DeepSeekRequest = {
    model: model || env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat',
    messages,
    stream: true,
    ...(temperature !== undefined && { temperature }),
    ...(maxTokens !== undefined && { max_tokens: maxTokens }),
  }

  const response = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`)
  }

  return response
}
