import { createFileRoute } from '@tanstack/react-router'

// GET /api/chat/sessions — lists the caller's chat sessions (newest first)
// for the conversation sidebar. API-only route; imports stay lazy so the DB
// driver never reaches the client bundle (same pattern as api.chat.ts).

export const Route = createFileRoute('/api/chat/sessions')({
  server: {
    handlers: {
      GET: async () => {
        const { getSessionUser } = await import('../auth/session')
        const user = await getSessionUser()
        if (!user) {
          return new Response('Authentication required.', { status: 401 })
        }

        const { runMigrations } = await import('../db/migrate')
        const { ChatRepository } =
          await import('../repositories/chat-repository')

        runMigrations()
        const chatRepo = new ChatRepository()

        const sessions = chatRepo.listSessions(user.id).map((s) => ({
          id: s.id,
          modelId: s.modelId,
          updatedAt: s.updatedAt,
          // First user message as the row label, kept short for the sidebar.
          title: s.title?.slice(0, 80) ?? null,
        }))

        return Response.json({ sessions })
      },
    },
  },
})
