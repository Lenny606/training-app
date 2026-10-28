// SERVER-ONLY — never import from the client bundle.

import {
  VideoRepository,
  VideoValidationError,
} from '../../repositories/video-repository'
import type { Video } from '../../repositories/video-repository'
import {
  addVideoDef,
  deleteVideoDef,
  listVideosDef,
  updateVideoDef,
} from './definitions'

function toOutput({ id, title, youtubeId, url }: Video) {
  return { id, title, youtubeId, url }
}

function errText(e: unknown): string {
  if (e instanceof VideoValidationError) return e.message
  if (e instanceof Error) return e.message
  return 'Unexpected error'
}

/** Server implementations of the video library tools, scoped to `userId`. */
export function videoTools(
  userId: string,
  videoRepo: VideoRepository = new VideoRepository(),
) {
  const listVideos = listVideosDef.server(async () => ({
    videos: videoRepo.list(userId).map(toOutput),
  }))

  const addVideo = addVideoDef.server(async ({ url, title }) => {
    try {
      return { video: toOutput(videoRepo.create(userId, { url, title })) }
    } catch (e) {
      return { error: errText(e) }
    }
  })

  const updateVideo = updateVideoDef.server(async ({ videoId, url, title }) => {
    try {
      const video = videoRepo.update(videoId, userId, {
        url: url ?? undefined,
        title: title ?? undefined,
      })
      return video
        ? { video: toOutput(video) }
        : { error: `Video "${videoId}" was not found.` }
    } catch (e) {
      return { error: errText(e) }
    }
  })

  const deleteVideo = deleteVideoDef.server(async ({ videoId }) => ({
    deleted: videoRepo.delete(videoId, userId),
    id: videoId,
  }))

  return [listVideos, addVideo, updateVideo, deleteVideo]
}
