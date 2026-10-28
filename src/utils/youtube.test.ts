import { describe, it, expect } from 'vitest'
import { parseYouTubeId } from './youtube'

describe('parseYouTubeId', () => {
  const id = 'dQw4w9WgXcQ'

  it.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?feature=share&v=${id}&t=42s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `youtube.com/watch?v=${id}`,
    `  https://youtu.be/${id}  `,
  ])('parses %s', (input) => {
    expect(parseYouTubeId(input)).toBe(id)
  })

  it.each([
    '',
    'not a url',
    'https://vimeo.com/123456',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/UC123',
    `https://evil.com/watch?v=${id}`,
  ])('rejects %s', (input) => {
    expect(parseYouTubeId(input)).toBeNull()
  })
})
