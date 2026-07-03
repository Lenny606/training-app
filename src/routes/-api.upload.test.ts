import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { Route } from './api.upload'
import { createDb, type DbClient } from '../db/client'
import { runMigrations } from '../db/migrate'
import { media } from '../db/schema'
import { eq } from 'drizzle-orm'
import fs from 'node:fs'
import path from 'node:path'

const testUploadDir = path.resolve(process.cwd(), 'data/test-uploads')

// Mock user session
let mockUser: { id: string; email: string } | null = { id: 'user-1', email: 'test@example.com' }

vi.mock('../auth/session', () => ({
  getSessionUser: vi.fn(() => Promise.resolve(mockUser)),
}))

// Mock DB client to return in-memory DB but preserve createDb
let db: DbClient
vi.mock('../db/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/client')>()
  return {
    ...actual,
    getDb: () => db,
  }
})

// Mock upload directory
vi.mock('../utils/upload', () => ({
  getUploadDir: () => testUploadDir,
}))

describe('POST /api/upload', () => {
  beforeEach(async () => {
    // Set up in-memory db and run migrations
    db = createDb(':memory:')
    runMigrations(db)

    // Insert user into DB to satisfy foreign key constraint
    const { users: usersTable } = await import('../db/schema')
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'dummy-hash',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).run()

    // Reset session user
    mockUser = { id: 'user-1', email: 'test@example.com' }

    // Ensure clean test uploads directory
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testUploadDir, { recursive: true })
  })

  afterEach(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true })
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postHandler = (Route.options.server?.handlers as any)?.POST
  if (!postHandler) {
    throw new Error('POST handler not found on Route options')
  }

  // 1x1 transparent PNG file
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  )

  it('rejects unauthenticated requests with 401', async () => {
    mockUser = null

    const formData = new FormData()
    formData.append('file', new File([pngBuffer], 'test.png', { type: 'image/png' }))

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Authentication required.')
  })

  it('rejects requests with missing file with 400', async () => {
    const formData = new FormData()

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('No file provided or invalid file format.')
  })

  it('successfully compresses a PNG image and converts it to WebP', async () => {
    const formData = new FormData()
    formData.append('file', new File([pngBuffer], 'test-image.png', { type: 'image/png' }))

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.originalName).toBe('test-image.png')
    expect(data.mimeType).toBe('image/webp')
    expect(data.fileName).toMatch(/\.webp$/)

    // Verify file exists on disk
    const savedFilePath = path.join(testUploadDir, data.fileName)
    expect(fs.existsSync(savedFilePath)).toBe(true)

    // Verify database record
    const dbRecord = db.select().from(media).where(eq(media.id, data.id)).all()[0]
    expect(dbRecord).toBeDefined()
    expect(dbRecord.id).toBe(data.id)
    expect(dbRecord.fileName).toBe(data.fileName)
    expect(dbRecord.mimeType).toBe('image/webp')
  })

  it('saves SVG file without compression or format conversion', async () => {
    const svgContent = '<svg><rect width="10" height="10" /></svg>'
    const svgBuffer = Buffer.from(svgContent)

    const formData = new FormData()
    formData.append('file', new File([svgBuffer], 'logo.svg', { type: 'image/svg+xml' }))

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.originalName).toBe('logo.svg')
    expect(data.mimeType).toBe('image/svg+xml')
    expect(data.fileName).toMatch(/\.svg$/)

    // Verify file exists on disk and has identical content
    const savedFilePath = path.join(testUploadDir, data.fileName)
    expect(fs.existsSync(savedFilePath)).toBe(true)
    const savedContent = fs.readFileSync(savedFilePath, 'utf-8')
    expect(savedContent).toBe(svgContent)
  })

  it('saves video file without compression or format conversion', async () => {
    const videoBuffer = Buffer.from('fake-mp4-video-bytes')

    const formData = new FormData()
    formData.append('file', new File([videoBuffer], 'exercise.mp4', { type: 'video/mp4' }))

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.originalName).toBe('exercise.mp4')
    expect(data.mimeType).toBe('video/mp4')
    expect(data.fileName).toMatch(/\.mp4$/)

    // Verify file exists on disk
    const savedFilePath = path.join(testUploadDir, data.fileName)
    expect(fs.existsSync(savedFilePath)).toBe(true)
    expect(fs.readFileSync(savedFilePath).equals(videoBuffer)).toBe(true)
  })

  it('falls back to original file upload if sharp fails', async () => {
    // We pass an invalid png/image buffer that will cause sharp to throw an error,
    // but with type: 'image/png' so it enters the sharp block.
    const invalidImageBuffer = Buffer.from('invalid-garbage-bytes')

    const formData = new FormData()
    formData.append('file', new File([invalidImageBuffer], 'bad-image.png', { type: 'image/png' }))

    const request = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData,
    })

    // Capture console warnings to avoid polluting output
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const response = await postHandler({ request })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.originalName).toBe('bad-image.png')
    // MimeType and extension should be original
    expect(data.mimeType).toBe('image/png')
    expect(data.fileName).toMatch(/\.png$/)

    // Verify it fell back and saved the original buffer
    const savedFilePath = path.join(testUploadDir, data.fileName)
    expect(fs.existsSync(savedFilePath)).toBe(true)
    expect(fs.readFileSync(savedFilePath).equals(invalidImageBuffer)).toBe(true)

    expect(consoleWarnSpy).toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })
})
