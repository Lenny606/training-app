import { describe, it, expect } from 'vitest'
import { formatTime } from './time'

describe('formatTime', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('formats positive values less than a minute', () => {
    expect(formatTime(5)).toBe('00:05')
    expect(formatTime(35)).toBe('00:35')
  })

  it('formats minutes and seconds correctly', () => {
    expect(formatTime(60)).toBe('01:00')
    expect(formatTime(75)).toBe('01:15')
    expect(formatTime(180)).toBe('03:00')
  })

  it('handles values with double digit minutes', () => {
    expect(formatTime(600)).toBe('10:00')
    expect(formatTime(3599)).toBe('59:59')
  })

  it('handles negative inputs gracefully', () => {
    expect(formatTime(-10)).toBe('00:00')
  })

  it('handles values greater than one hour', () => {
    expect(formatTime(3600)).toBe('60:00')
    expect(formatTime(4000)).toBe('66:40')
  })
})
