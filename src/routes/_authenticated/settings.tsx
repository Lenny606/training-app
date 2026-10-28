import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Copy, KeyRound, Trash2 } from 'lucide-react'
import {
  createApiToken,
  listApiTokens,
  revokeApiToken,
} from '../../server/api-tokens'

export const Route = createFileRoute('/_authenticated/settings')({
  loader: () => listApiTokens(),
  component: Settings,
})

function Settings() {
  const tokens = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState('Claude Code')
  const [created, setCreated] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const command = `claude mcp add --transport http training ${origin}/api/mcp --header "Authorization: Bearer ${created ?? '<token>'}"`

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const { token } = await createApiToken({ data: { name } })
      setCreated(token)
      await router.invalidate()
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke(id: string, tokenName: string) {
    if (
      !window.confirm(
        `Revoke token “${tokenName}”? Clients using it stop working.`,
      )
    )
      return
    await revokeApiToken({ data: { id } })
    await router.invalidate()
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
        <div>
          <p className="island-kicker mb-2">Settings</p>
          <h1 className="display-title mb-3 text-3xl font-bold text-ink">
            API tokens
          </h1>
          <p className="m-0 max-w-3xl text-sm leading-7 text-ink-soft">
            Connect Claude Code (or any MCP client) to manage your plans from
            the terminal. A token grants full access to your plans and workout
            logs — treat it like a password.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Token name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              required
              className="demo-input"
            />
          </label>
          <button type="submit" disabled={busy} className="demo-button">
            <KeyRound className="h-4 w-4" aria-hidden /> Create token
          </button>
        </form>

        {created && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-xs"
          >
            <strong className="text-success">
              Copy the command now — the token won’t be shown again.
            </strong>
            <div className="flex items-start gap-2">
              <code className="flex-1 break-all">{command}</code>
              <button
                type="button"
                className="demo-button text-xs py-1.5 px-3"
                aria-label="Copy command"
                onClick={() => navigator.clipboard.writeText(command)}
              >
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        )}

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {tokens.length === 0 && (
            <li className="text-sm text-ink-soft">No active tokens.</li>
          )}
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-sm"
            >
              <span>
                <strong>{t.name}</strong>
                <span className="ml-2 text-xs text-ink-soft">
                  created {new Date(t.createdAt).toLocaleDateString()} · last
                  used{' '}
                  {t.lastUsedAt
                    ? new Date(t.lastUsedAt).toLocaleString()
                    : 'never'}
                </span>
              </span>
              <button
                type="button"
                className="demo-button text-xs py-1.5 px-3"
                aria-label={`Revoke token ${t.name}`}
                onClick={() => handleRevoke(t.id, t.name)}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
