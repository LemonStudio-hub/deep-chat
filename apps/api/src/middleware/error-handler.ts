import type { ErrorHandler } from 'hono'
import type { Env } from '../types'

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  console.error('[Error]', err.message)

  return c.json(
    {
      error: {
        message: err.message || 'Internal server error',
        type: 'server_error',
      },
    },
    500,
  )
}
