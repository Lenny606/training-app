import { useState, useEffect } from 'react'
import { Link, useNavigate, useRouter, useRouterState } from '@tanstack/react-router'
import { Menu, X, LogOut } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { logout } from '../server/auth'
import type { RouterContext } from '../routes/__root'

const NAV_LINKS = [
  { to: '/', label: 'Workout' },
  { to: '/admin', label: 'Administration' },
  { to: '/assistant', label: 'Assistant' },
] as const

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const routerState = useRouterState()
  const router = useRouter()
  const navigate = useNavigate()

  const user = useRouterState({
    select: (s) => (s.matches[0]?.context as RouterContext | undefined)?.user ?? null,
  })

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [routerState.location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  async function handleLogout() {
    await logout()
    await router.invalidate()
    await navigate({ to: '/login' })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-x-3 py-3 sm:py-4">
        {/* Home Link Symbol */}
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] font-display font-bold text-sm text-[var(--sea-ink)] no-underline hover:border-[var(--lagoon)] transition-all"
          aria-label="Home"
        >
          ▲
        </Link>

        {/* Desktop nav links — only when signed in */}
        {user && (
          <div className="hidden sm:flex items-center gap-x-6 text-sm font-semibold ml-4">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to} className="nav-link" activeProps={{ className: 'nav-link is-active' }}>
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side: theme toggle + auth controls */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Theme toggle — hidden on mobile when signed in (moved into hamburger menu) */}
          <span className={user ? 'hidden sm:inline-flex' : 'inline-flex'}>
            <ThemeToggle />
          </span>

          {user ? (
            <>
              <span
                className="hidden md:inline max-w-[16ch] truncate text-xs font-semibold text-[var(--sea-ink-soft)]"
                title={user.email}
              >
                {user.email}
              </span>


              {/* Hamburger — only on mobile */}
              <button
                className="sm:hidden demo-button demo-button-icon min-h-11 min-w-11 border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="demo-button demo-button-sm min-h-11 inline-flex items-center no-underline"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile dropdown menu — only when signed in */}
      {user && menuOpen && (
        <div className="sm:hidden border-t border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg px-4 pb-4 pt-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="block rounded-xl px-4 py-3 text-sm font-semibold text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] [&.is-active]:text-[var(--lagoon)] [&.is-active]:bg-[rgba(0,240,255,0.06)]"
              activeProps={{ className: 'is-active' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <div className="mt-1 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-[var(--sea-ink-soft)]">
            <span>Dark mode</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
