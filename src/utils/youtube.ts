const ID_RE = /^[\w-]{11}$/

/**
 * Extracts the 11-char video id from any common YouTube URL form (watch,
 * youtu.be, shorts, embed, live, music) or a bare id. Returns null otherwise.
 */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim()
  if (ID_RE.test(value)) return value

  let url: URL
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^(www|m|music)\./, '')
  let id: string | null = null
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, kind, rest] = url.pathname.split('/')
    id =
      kind === 'watch'
        ? url.searchParams.get('v')
        : ['shorts', 'embed', 'live', 'v'].includes(kind)
          ? (rest ?? null)
          : null
  }
  return id && ID_RE.test(id) ? id : null
}

export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}
