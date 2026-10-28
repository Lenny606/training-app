import { and, desc, eq } from 'drizzle-orm'
import type { DbClient } from '../db/client'
import { getDb } from '../db/client'
import { videos } from '../db/schema'
import { createId } from '../utils/id'
import { parseYouTubeId, youTubeWatchUrl } from '../utils/youtube'

export interface Video {
  id: string
  youtubeId: string
  title: string
  url: string
  createdAt: Date
}

export class VideoValidationError extends Error {}

function toYouTubeId(url: string): string {
  const id = parseYouTubeId(url)
  if (!id) throw new VideoValidationError(`Not a valid YouTube URL: ${url}`)
  return id
}

function toVideo(row: typeof videos.$inferSelect): Video {
  return {
    id: row.id,
    youtubeId: row.youtubeId,
    title: row.title,
    url: youTubeWatchUrl(row.youtubeId),
    createdAt: row.createdAt,
  }
}

/** Drizzle/SQLite-backed saved YouTube videos. Server-only, scoped per user. */
export class VideoRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  list(userId: string): Video[] {
    return this.db
      .select()
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.createdAt))
      .all()
      .map(toVideo)
  }

  get(id: string, userId: string): Video | null {
    const row = this.db
      .select()
      .from(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)))
      .get()
    return row ? toVideo(row) : null
  }

  /** @throws VideoValidationError when `url` isn't a YouTube link. */
  create(userId: string, input: { url: string; title: string }): Video {
    const row = {
      id: createId('vid'),
      userId,
      youtubeId: toYouTubeId(input.url),
      title: input.title.trim(),
      createdAt: new Date(),
    }
    this.db.insert(videos).values(row).run()
    return toVideo(row)
  }

  /** Returns null when the video doesn't exist for this user. */
  update(
    id: string,
    userId: string,
    patch: { url?: string; title?: string },
  ): Video | null {
    const set: Partial<typeof videos.$inferInsert> = {}
    if (patch.url !== undefined) set.youtubeId = toYouTubeId(patch.url)
    if (patch.title !== undefined) set.title = patch.title.trim()
    if (Object.keys(set).length > 0) {
      this.db
        .update(videos)
        .set(set)
        .where(and(eq(videos.id, id), eq(videos.userId, userId)))
        .run()
    }
    return this.get(id, userId)
  }

  delete(id: string, userId: string): boolean {
    const res = this.db
      .delete(videos)
      .where(and(eq(videos.id, id), eq(videos.userId, userId)))
      .run()
    return res.changes > 0
  }
}
