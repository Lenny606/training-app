import { describe, it, expect } from 'vitest'
import { createId } from './id'

describe('createId', () => {
  it('should generate an ID starting with the specified prefix', () => {
    const id = createId('plan')
    expect(id.startsWith('plan-')).toBe(true)
  })

  it('should generate unique IDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(createId('act'))
    }
    expect(ids.size).toBe(100)
  })

  it('should fallback gracefully when crypto.randomUUID is not available', () => {
    const originalRandomUUID =
      typeof crypto !== 'undefined' ? crypto.randomUUID : undefined

    if (typeof crypto !== 'undefined') {
      // Temporarily delete or override randomUUID to test fallback
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      crypto.randomUUID = undefined
    }

    try {
      const id = createId('test')
      expect(id.startsWith('test-')).toBe(true)
      expect(id.length).toBeGreaterThan(5)
    } finally {
      if (typeof crypto !== 'undefined' && originalRandomUUID) {
        // Restore
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        crypto.randomUUID = originalRandomUUID
      }
    }
  })
})
