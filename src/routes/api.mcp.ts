import { createFileRoute } from '@tanstack/react-router'

// Remote MCP endpoint (Streamable HTTP, stateless) for Claude Code & co.:
//   claude mcp add --transport http training https://<host>/api/mcp \
//     --header "Authorization: Bearer tap_…"
//
// Auth is a personal API token (created in /settings), never the session
// cookie — so no CSRF surface. Same lazy-import pattern as `api.chat.ts` to keep
// the MCP SDK and better-sqlite3 out of the client bundle.

const RATE_LIMIT = 60
const RATE_WINDOW_MS = 60_000

async function handle({ request }: { request: Request }): Promise<Response> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) {
    return new Response('Missing bearer token.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer' },
    })
  }

  const { runMigrations } = await import('../db/migrate')
  const { ApiTokenRepository } =
    await import('../repositories/api-token-repository')
  runMigrations()

  const userId = new ApiTokenRepository().authenticate(token)
  if (!userId) {
    return new Response('Invalid or revoked token.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' },
    })
  }

  const { checkRateLimit } = await import('../auth/rate-limit')
  if (!checkRateLimit(`mcp:${userId}`, RATE_LIMIT, RATE_WINDOW_MS)) {
    return new Response('Too many requests.', { status: 429 })
  }

  const { WebStandardStreamableHTTPServerTransport } =
    await import('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js')
  const { buildMcpServer } = await import('../ai/mcp-server')
  const { SqlitePlanRepository } =
    await import('../repositories/sqlite-plan-repository')

  // Stateless: a fresh server + transport per request (no session ids), so it
  // survives `pm2 reload` and needs no shared state between workers.
  const server = buildMcpServer(userId, new SqlitePlanRepository())
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(request)
}

export const Route = createFileRoute('/api/mcp')({
  server: {
    handlers: {
      POST: handle,
      GET: handle,
      DELETE: handle,
    },
  },
})
