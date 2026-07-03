import { useEffect, useRef } from 'react'

/**
 * Keeps the device screen awake while `enabled` is true using the Screen Wake
 * Lock API. The lock is automatically re-acquired when the tab becomes visible
 * again (the browser releases it whenever the page is hidden or the device
 * sleeps). No-ops gracefully on browsers without support.
 */
export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (
      !enabled ||
      typeof navigator === 'undefined' ||
      !('wakeLock' in navigator)
    ) {
      return
    }

    let cancelled = false

    const acquire = async () => {
      if (sentinelRef.current || document.visibilityState !== 'visible') return
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        sentinelRef.current = sentinel
        sentinel.addEventListener('release', () => {
          sentinelRef.current = null
        })
      } catch {
        // Request can reject (e.g. tab not visible, low battery) — ignore.
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void sentinelRef.current?.release()
      sentinelRef.current = null
    }
  }, [enabled])
}
