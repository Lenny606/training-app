import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Check, Copy, KeyRound, Trash2 } from 'lucide-react'
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
  const [copied, setCopied] = useState(false)

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

  async function handleCopy() {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function handleRevoke(id: string, tokenName: string) {
    if (!window.confirm(`Revoke “${tokenName}”?`)) return
    await revokeApiToken({ data: { id } })
    await router.invalidate()
  }

  return (
    <main className="page-wrap py-6 sm:py-12">
      <section className="demo-panel mx-auto max-w-2xl p-5 flex flex-col gap-5">
        <div>
          <h1 className="m-0 mb-1 font-display text-xl font-bold text-ink">
            API tokens
          </h1>
          <p className="m-0 text-xs text-ink-soft">
            For Claude Code / MCP. Full access — keep it secret.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-ink-soft">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              required
              className="demo-input"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="demo-button demo-button-primary min-h-11"
          >
            <KeyRound className="h-4 w-4" aria-hidden /> Create token
          </button>
        </form>

        {created && (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-xs"
          >
            <strong className="text-success">
              Copy now — shown only once.
            </strong>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
              <code className="flex-1 break-all leading-relaxed">
                {command}
              </code>
              <button
                type="button"
                className="demo-button demo-button-sm min-h-9"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {tokens.length === 0 && (
            <li className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
              No active tokens.
            </li>
          )}
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5 text-sm"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <strong className="truncate">{t.name}</strong>
                <span className="text-xs text-ink-soft">
                  created {new Date(t.createdAt).toLocaleDateString()} · last
                  used{' '}
                  {t.lastUsedAt
                    ? new Date(t.lastUsedAt).toLocaleString()
                    : 'never'}
                </span>
              </span>
              <button
                type="button"
                className="demo-button demo-button-danger h-9 w-9 flex-shrink-0 p-0"
                title="Revoke token"
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
