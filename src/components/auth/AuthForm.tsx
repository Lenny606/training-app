import { useState, useId } from 'react'
import type { FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'

interface AuthFormProps {
  title: string
  submitLabel: string
  onSubmit: (email: string, password: string) => Promise<void>
  footer: { prompt: string; linkLabel: string; to: string }
  /** Hint shown under the password field (e.g. min length on register). */
  passwordHint?: string
}

export function AuthForm({
  title,
  submitLabel,
  onSubmit,
  footer,
  passwordHint,
}: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const emailId = useId()
  const passwordId = useId()
  const passwordHintId = useId()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(email, password)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
      setSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-10 sm:py-16 max-w-sm mx-auto">
      <div className="demo-panel p-6 sm:p-8 flex flex-col gap-6 rise-in">
        <h1 className="m-0 font-display text-xl font-black uppercase tracking-wider text-ink">
          {title}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">
            <label htmlFor={emailId}>Email</label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="demo-input text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5 text-sm font-semibold text-ink-soft">
            <label htmlFor={passwordId}>Password</label>
            <input
              id={passwordId}
              type="password"
              autoComplete={
                submitLabel === 'Create account'
                  ? 'new-password'
                  : 'current-password'
              }
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={passwordHint ? passwordHintId : undefined}
              className="demo-input text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            {passwordHint && (
              <span
                id={passwordHintId}
                className="text-xs font-normal text-ink-soft opacity-70"
              >
                {passwordHint}
              </span>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="m-0 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs text-danger"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="demo-button min-h-11 justify-center flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:outline-none"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Please wait…' : submitLabel}
          </button>
        </form>

        <p className="m-0 text-center text-xs text-ink-soft">
          {footer.prompt}{' '}
          <Link
            to={footer.to}
            className="font-semibold text-lagoon no-underline focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:outline-none rounded-sm"
          >
            {footer.linkLabel}
          </Link>
        </p>
      </div>
    </main>
  )
}
