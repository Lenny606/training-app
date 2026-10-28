import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware'

// Saved YouTube videos. Same lazy server-only import pattern as
// `server/plans.ts#getRepo`.
async function getRepo() {
  const { VideoRepository } = await import('../repositories/video-repository')
  const { runMigrations } = await import('../db/migrate')

  runMigrations()
  return new VideoRepository()
}

const videoInput = z.object({
  url: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(200),
})

export const listVideos = createServerFn({ method: 'GET' })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const repo = await getRepo()
    return repo.list(context.user.id)
  })

/** Throws when the URL isn't a recognisable YouTube link. */
export const createVideo = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(videoInput)
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    return repo.create(context.user.id, data)
  })

export const updateVideo = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(videoInput.partial().extend({ id: z.string().min(1) }))
  .handler(async ({ data: { id, ...patch }, context }) => {
    const repo = await getRepo()
    const video = repo.update(id, context.user.id, patch)
    if (!video) throw new Error('Video not found.')
    return video
  })

export const deleteVideo = createServerFn({ method: 'POST' })
  .middleware([requireAuth])
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const repo = await getRepo()
    repo.delete(data.id, context.user.id)
    return { id: data.id }
  })
