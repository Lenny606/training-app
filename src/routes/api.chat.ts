import { createFileRoute } from '@tanstack/react-router'

// Streaming AG-UI chat endpoint for the training assistant.
//
// This is an API-only route (no component). Every AI/DB/auth import is loaded
// lazily *inside* the handler so the provider SDKs (@anthropic-ai/sdk, openai)
// and better-sqlite3 stay in the server bundle and never reach the client —
// same defensive pattern as `server/plans.ts#getRepo`.

// Per-user token-bucket: chat runs cost money, so cap requests per minute.
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60_000

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getSessionUser } = await import('../auth/session')
        const user = await getSessionUser()
        if (!user) {
          return new Response('Authentication required.', { status: 401 })
        }

        const { checkRateLimit } = await import('../auth/rate-limit')
        if (!checkRateLimit(`chat:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS)) {
          return new Response('Too many requests. Please slow down.', {
            status: 429,
          })
        }

        const body = await request.json().catch(() => null)
        if (!body || !Array.isArray(body.messages)) {
          return new Response('Invalid request body.', { status: 400 })
        }

        const { chat, toServerSentEventsResponse, maxIterations } =
          await import('@tanstack/ai')
        const { createAdapter } = await import('../ai/client')
        const { resolveModelId } = await import('../ai/models')
        const { SYSTEM_PROMPT } = await import('../ai/system-prompt')
        const { buildTools } = await import('../ai/tools')
        const { SqlitePlanRepository } =
          await import('../repositories/sqlite-plan-repository')
        const { runMigrations } = await import('../db/migrate')

        runMigrations()
        const repo = new SqlitePlanRepository()
        const modelId = resolveModelId(body.model)
        const abortController = new AbortController()

        const stream = chat({
          adapter: createAdapter(modelId),
          messages: body.messages,
          systemPrompts: [SYSTEM_PROMPT],
          tools: buildTools(user.id, repo),
          // Cap the agent loop so a misbehaving model can't run tools forever.
          agentLoopStrategy: maxIterations(12),
          middleware: [
            {
              name: 'usage-log',
              onUsage(_ctx, usage) {
                console.log(
                  `[ai] user=${user.id} model=${modelId} tokens=${usage.totalTokens}`,
                )
              },
            },
          ],
          abortController,
        })

        return toServerSentEventsResponse(stream, { abortController })
      },
    },
  },
})
