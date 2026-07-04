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
      // ------------------------------------------------------------------
      // GET /api/chat?sessionId=<id>
      // Returns the stored messages for a session so the client can restore
      // the conversation after a page reload.
      // ------------------------------------------------------------------
      GET: async ({ request }) => {
        const { getSessionUser } = await import('../auth/session')
        const user = await getSessionUser()
        if (!user) {
          return new Response('Authentication required.', { status: 401 })
        }

        const url = new URL(request.url)
        const sessionId = url.searchParams.get('sessionId')
        if (!sessionId) {
          return Response.json({ messages: [] })
        }

        const { runMigrations } = await import('../db/migrate')
        const { ChatRepository } = await import(
          '../repositories/chat-repository'
        )

        runMigrations()
        const chatRepo = new ChatRepository()
        const session = chatRepo.findSession(sessionId)

        // Guard: a user may not read another user's session.
        if (!session || session.userId !== user.id) {
          return Response.json({ messages: [] })
        }

        const rows = chatRepo.getMessages(sessionId)
        const messages = rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          // Rehydrate the parts array if present (tool calls, thinking, etc.)
          parts: r.parts ? JSON.parse(r.parts) : [{ type: 'text', content: r.content }],
        }))

        return Response.json({ messages })
      },

      // ------------------------------------------------------------------
      // POST /api/chat
      // Accepts { messages, model, sessionId? } — sessionId is optional.
      // When provided, stored history is prepended as context and every
      // new round-trip is persisted to the database.
      // ------------------------------------------------------------------
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
        const { SqlitePlanRepository } = await import(
          '../repositories/sqlite-plan-repository'
        )
        const { ChatRepository } = await import(
          '../repositories/chat-repository'
        )
        const { runMigrations } = await import('../db/migrate')

        runMigrations()

        const repo = new SqlitePlanRepository()
        const chatRepo = new ChatRepository()
        const modelId = resolveModelId(body.model)
        const sessionId: string | undefined = body.sessionId

        // ------------------------------------------------------------------
        // Persist: ensure session + load history as extra context
        // ------------------------------------------------------------------
        let historyContext: Array<{ role: 'user' | 'assistant'; content: string }> = []

        if (sessionId) {
          chatRepo.ensureSession(sessionId, user.id, modelId)
          historyContext = chatRepo.getHistoryForContext(sessionId)
        }

        // The incoming `body.messages` are the messages the client already
        // knows about. We prepend older history that the client might not have
        // (e.g. after a page reload where it only sent the current turn).
        const allMessages = [...historyContext, ...body.messages]

        // Extract the latest user message to save before sending to the LLM.
        const lastUserMessage = [...body.messages]
          .reverse()
          .find((m: { role: string }) => m.role === 'user')

        const abortController = new AbortController()

        const stream = chat({
          adapter: createAdapter(modelId),
          messages: allMessages,
          systemPrompts: [SYSTEM_PROMPT],
          tools: buildTools(user.id, repo),
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
            // ---------------------------------------------------------------
            // Persistence middleware — saves user message + assistant reply
            // ---------------------------------------------------------------
            {
              name: 'persist-history',
              onStart() {
                if (!sessionId || !lastUserMessage) return
                chatRepo.saveMessage({
                  id: crypto.randomUUID(),
                  sessionId,
                  role: 'user',
                  content:
                    typeof lastUserMessage.content === 'string'
                      ? lastUserMessage.content
                      : JSON.stringify(lastUserMessage.content),
                  parts: lastUserMessage.parts,
                })
              },
              onFinish(_ctx, info) {
                if (!sessionId) return
                // info.content contains the final assembled text from the assistant
                chatRepo.saveMessage({
                  id: crypto.randomUUID(),
                  sessionId,
                  role: 'assistant',
                  content: info.content ?? '',
                  parts: [{ type: 'text', content: info.content ?? '' }],
                })
                chatRepo.touchSession(sessionId)
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
