import { createFileRoute } from '@tanstack/react-router'

// DELETE /api/chat/sessions/$sessionId — removes a conversation (session +
// messages). Only the owner may delete; anyone else gets a 404 so session IDs
// can't be probed.

export const Route = createFileRoute('/api/chat/sessions/$sessionId')({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        const { getSessionUser } = await import('../auth/session')
        const user = await getSessionUser()
        if (!user) {
          return new Response('Authentication required.', { status: 401 })
        }

        const { runMigrations } = await import('../db/migrate')
        const { ChatRepository } = await import(
          '../repositories/chat-repository'
        )

        runMigrations()
        const chatRepo = new ChatRepository()

        const session = chatRepo.findSession(params.sessionId)
        if (!session || session.userId !== user.id) {
          return new Response('Not found.', { status: 404 })
        }

        chatRepo.deleteSession(params.sessionId)
        return Response.json({ ok: true })
      },
    },
  },
})
