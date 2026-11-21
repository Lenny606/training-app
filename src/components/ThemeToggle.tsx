import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

type ThemeMode = 'light' | 'dark' | 'auto'

const MODE_META = {
  auto: { icon: Monitor, name: 'Auto' },
  light: { icon: Sun, name: 'Light' },
  dark: { icon: Moon, name: 'Dark' },
} as const

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem('theme')
  const valid = new Set<string>(['light', 'dark'])
  return valid.has(stored || '') ? (stored as ThemeMode) : 'auto'
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }

  document.documentElement.style.colorScheme = resolved
}

interface ThemeToggleProps {
  /** Show the mode name next to the icon (used where there is room for it). */
  showLabel?: boolean
}

export default function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')

    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [mode])

  function toggleMode() {
    const nextMode: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    setMode(nextMode)
    applyThemeMode(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  const label =
    mode === 'auto'
      ? 'Theme mode: auto (system). Click to switch to light mode.'
      : `Theme mode: ${mode}. Click to switch mode.`

  const { icon: Icon, name } = MODE_META[mode]

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-chip-line bg-chip px-3 text-sm font-semibold text-ink-soft hover:text-ink"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {showLabel && <span>{name}</span>}
    </button>
  )
}
