import { Hono } from 'hono'
import type { DeepSeekModel } from '@deep-chat/shared'
import type { Env } from '../types'

interface ModelInfo {
  id: DeepSeekModel
  name: string
  description: string
}

const MODELS: ModelInfo[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: 'General-purpose conversational model (DeepSeek-V3)',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    description: 'Advanced reasoning model (DeepSeek-R1) with chain-of-thought',
  },
]

const models = new Hono<{ Bindings: Env }>()

models.get('/', (c) => {
  return c.json({ models: MODELS })
})

export default models
