import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { Route } from './api.generate-image'
import { createDb, type DbClient } from '../db/client'
import { runMigrations } from '../db/migrate'
import { media } from '../db/schema'
import { eq } from 'drizzle-orm'
import fs from 'node:fs'
import path from 'node:path'

const testUploadDir = path.resolve(process.cwd(), 'data/test-uploads-gen')

// Mock user session
let mockUser: { id: string; email: string } | null = {
  id: 'user-1',
  email: 'test@example.com',
}

vi.mock('../auth/session', () => ({
  getSessionUser: vi.fn(() => Promise.resolve(mockUser)),
}))

// Mock DB client to return in-memory DB
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

describe('POST /api/generate-image', () => {
  beforeEach(async () => {
    // Set up in-memory db and run migrations
    db = createDb(':memory:')
    runMigrations(db)

    // Insert user into DB to satisfy foreign key constraint
    const { users: usersTable } = await import('../db/schema')
    await db
      .insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'dummy-hash',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run()

    // Reset session user
    mockUser = { id: 'user-1', email: 'test@example.com' }

    // Ensure clean test uploads directory
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testUploadDir, { recursive: true })

    // Set mock env variable
    process.env.OPENAI_API_KEY = 'mock-key'
  })

  afterEach(() => {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true })
    }
    vi.restoreAllMocks()
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postHandler = (Route.options.server?.handlers as any)?.POST
  if (!postHandler) {
    throw new Error('POST handler not found on Route options')
  }

  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  )

  it('rejects unauthenticated requests with 401', async () => {
    mockUser = null

    const request = new Request('http://localhost/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ name: 'Pushups' }),
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Authentication required.')
  })

  it('rejects requests with missing name with 400', async () => {
    const request = new Request('http://localhost/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ description: 'Do some pushups' }),
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Activity name is required.')
  })

  it('successfully generates, downloads, optimizes and saves an image', async () => {
    // Mock OpenAI and image download calls
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    
    // First call: OpenAI generations API
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ url: 'https://fake-openai-url.com/generated-image.png' }],
      }),
    } as Response)

    // Second call: downloading the image
    fetchMock.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new Uint8Array(pngBuffer).buffer,
    } as Response)

    const request = new Request('http://localhost/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ name: 'Pushups', description: 'Standard pushups' }),
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.originalName).toBe('Pushups (AI Generated).webp')
    expect(data.mimeType).toBe('image/webp')
    expect(data.fileName).toMatch(/\.webp$/)

    // Check fetch parameters for DALL-E call
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const openAiCallArgs = fetchMock.mock.calls[0]
    expect(openAiCallArgs[0]).toBe('https://api.openai.com/v1/images/generations')
    
    const requestOptions = openAiCallArgs[1] as RequestInit
    expect(requestOptions.method).toBe('POST')
    expect((requestOptions.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-key')
    
    const bodyObj = JSON.parse(requestOptions.body as string)
    expect(bodyObj.model).toBe('dall-e-2')
    expect(bodyObj.size).toBe('512x512')
    expect(bodyObj.prompt).toContain('Pushups')
    expect(bodyObj.prompt).toContain('Standard pushups')

    // Verify file exists on disk
    const savedFilePath = path.join(testUploadDir, data.fileName)
    expect(fs.existsSync(savedFilePath)).toBe(true)

    // Verify database record
    const dbRecord = db
      .select()
      .from(media)
      .where(eq(media.id, data.id))
      .all()[0]
    expect(dbRecord).toBeDefined()
    expect(dbRecord.id).toBe(data.id)
    expect(dbRecord.fileName).toBe(data.fileName)
    expect(dbRecord.mimeType).toBe('image/webp')
  })

  it('fails if OpenAI API key is missing', async () => {
    delete process.env.OPENAI_API_KEY

    const request = new Request('http://localhost/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ name: 'Pushups' }),
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('AI generation is not configured on the server.')
  })

  it('handles OpenAI failures with 502 status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Rate limit exceeded',
    } as Response)

    const request = new Request('http://localhost/api/generate-image', {
      method: 'POST',
      body: JSON.stringify({ name: 'Pushups' }),
    })

    const response = await postHandler({ request })
    expect(response.status).toBe(502)
    expect(await response.text()).toContain('OpenAI generation failed: Rate limit exceeded')
  })
})
