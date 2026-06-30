import { useState, useEffect } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const NAV_LINKS = [
  { to: '/', label: 'Workout' },
  { to: '/admin', label: 'Administration' },
] as const

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const routerState = useRouterState()

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [routerState.location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-x-3 py-3 sm:py-4">

        {/* Logo */}
        <h2 className="m-0 flex-shrink-0 text-base font-bold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(0,240,255,0.05)] sm:px-4 sm:py-2"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--lagoon)] shadow-[0_0_8px_var(--lagoon)] animate-pulse" />
            <span className="font-display font-black tracking-wider uppercase text-xs">Titan Training</span>
          </Link>
        </h2>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-x-6 text-sm font-semibold ml-4">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side: theme toggle + hamburger */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          {/* Hamburger — only on mobile */}
          <button
            className="sm:hidden demo-button demo-button-icon border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
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
        </div>
      )}
    </header>
  )
}
