import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import Header from '../components/Header'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import type { PublicUser } from '../domain/users'
import { me } from '../server/auth'

import appCss from '../styles.css?url'

export interface RouterContext {
  user: PublicUser | null
}

// Offline support: register the service worker in production; in dev,
// unregister any SW left behind by a previous production run on this origin
// (a stale SW would serve cached assets and fight HMR).
const SW_SCRIPT = import.meta.env.PROD
  ? `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`
  : `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})})}`

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRouteWithContext<RouterContext>()({
  // Resolve the current user once per navigation and expose it on router
  // context so guards (`_authenticated`) and the Header can read it. Runs on the
  // server during SSR (reads the cookie) and as an RPC on client navigations.
  beforeLoad: async (): Promise<RouterContext> => {
    const user = await me()
    return { user }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'robots',
        content: 'noindex, nofollow',
      },
      {
        title: 'Apex',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      role="status"
      className="bg-chip border-b border-line px-4 py-1.5 text-center text-xs font-semibold text-ink-soft"
    >
      You're offline — cached plans and the workout timer still work.
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SW_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-lagoon/25">
        <Header />
        <OfflineBanner />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
