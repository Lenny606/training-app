// Apex service worker — offline support for the workout player.
//
// Strategy overview:
//   /assets/*            cache-first   (Vite-hashed, immutable)
//   navigations          network-first (fresh when online, cached page offline)
//   GET /_serverFn/*     network-first (plan data for offline loaders)
//   uploads/icons        stale-while-revalidate
//   everything else      passthrough   (POST /api/chat etc. need the network)
//
// Bump VERSION to invalidate all runtime caches on a breaking change.
const VERSION = 'v1'
const CACHE = `apex-${VERSION}`

const PRECACHE = ['/manifest.json', '/favicon.svg', '/logo192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request, { fallbackTo } = {}) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (err) {
    const cached = await caches.match(request)
    if (cached) return cached
    if (fallbackTo) {
      const fallback = await caches.match(fallbackTo)
      if (fallback) return fallback
    }
    throw err
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE)
  const cached = await caches.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  return cached ?? (await refresh) ?? Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Immutable build assets
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Page navigations — cached per-path so /, /assistant, … each work offline
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, { fallbackTo: '/' }))
    return
  }

  // Server function RPCs (route loaders on client navigations)
  if (url.pathname.startsWith('/_serverFn/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // User media + PWA icons
  if (
    url.pathname.startsWith('/uploads/') ||
    PRECACHE.includes(url.pathname) ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/logo512.png'
  ) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }
  // Everything else (e.g. /api/*) goes straight to the network.
})
