import { useState, useEffect } from 'react'
import {
  Link,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import {
  ClipboardList,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Timer,
  Video,
  X,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { logout } from '../server/auth'
import type { RouterContext } from '../routes/__root'

const NAV_LINKS = [
  { to: '/', label: 'Workout', icon: Timer },
  { to: '/admin', label: 'Administration', icon: ClipboardList },
  { to: '/videos', label: 'Videos', icon: Video },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

const ICON_BUTTON_CLASS =
  'h-11 w-11 items-center justify-center rounded-full border border-chip-line bg-chip text-ink-soft hover:text-ink'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const routerState = useRouterState()
  const router = useRouter()
  const navigate = useNavigate()

  const user = useRouterState({
    select: (s) =>
      (s.matches[0]?.context as RouterContext | undefined)?.user ?? null,
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
    <header className="sticky top-0 z-50 border-b border-line bg-header px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-x-3 py-2.5">
        <Link
          to="/"
          className="group inline-flex items-center gap-2.5 rounded-xl no-underline"
          aria-label="Apex home"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lagoon to-lagoon-deep text-lagoon-ink shadow-glow-lagoon-soft transition-transform group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 3.5 21.5 20h-5.2L12 12.4 7.7 20H2.5z" />
            </svg>
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Apex
          </span>
        </Link>

        {/* Desktop nav links — only when signed in */}
        {user && (
          <div className="ml-3 hidden items-center gap-0.5 text-sm font-semibold md:flex">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                <Icon className="hidden h-4 w-4 lg:block" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side: theme toggle + auth controls */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {user && (
            <span
              className="hidden max-w-16ch truncate text-xs font-semibold text-ink-soft lg:inline"
              title={user.email}
            >
              {user.email}
            </span>
          )}

          {/* Theme toggle — on mobile it lives in the hamburger menu when signed in */}
          <span className={user ? 'hidden md:inline-flex' : 'inline-flex'}>
            <ThemeToggle />
          </span>

          {user ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className={`${ICON_BUTTON_CLASS} hidden md:inline-flex`}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden />
              </button>

              <button
                type="button"
                className={`${ICON_BUTTON_CLASS} inline-flex md:hidden`}
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? (
                  <X className="h-5 w-5" aria-hidden />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden />
                )}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="demo-button demo-button-primary min-h-11 px-4 text-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile dropdown menu — only when signed in */}
      {user && menuOpen && (
        <div className="flex flex-col gap-1 border-t border-line pb-4 pt-3 md:hidden">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-ink-soft no-underline hover:bg-link-hover hover:text-ink [&.is-active]:bg-lagoon/10 [&.is-active]:text-lagoon-deep"
              activeProps={{ className: 'is-active' }}
              onClick={() => setMenuOpen(false)}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line px-4 pt-3 text-sm font-semibold text-ink-soft">
            <span className="min-w-0 truncate" title={user.email}>
              {user.email}
            </span>
            <ThemeToggle showLabel />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-ink-soft hover:bg-link-hover hover:text-ink"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
