/**
 * Formats a duration in seconds to MM:SS string.
 */
export function formatTime(secs: number): string {
  if (secs < 0) return '00:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
