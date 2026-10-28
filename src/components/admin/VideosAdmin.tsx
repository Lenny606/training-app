import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Check, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { Video } from '../../repositories/video-repository'
import { createVideo, deleteVideo, updateVideo } from '../../server/videos'
import { parseYouTubeId } from '../../utils/youtube'

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong'
}

interface VideoFieldsProps {
  url: string
  title: string
  onUrlChange: (url: string) => void
  onTitleChange: (title: string) => void
}

function VideoFields({
  url,
  title,
  onUrlChange,
  onTitleChange,
}: VideoFieldsProps) {
  return (
    <>
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-ink-soft">
        Title
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          maxLength={200}
          required
          className="demo-input"
        />
      </label>
      <label className="flex min-w-64 flex-[2] flex-col gap-1 text-xs text-ink-soft">
        YouTube URL
        <input
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          maxLength={500}
          required
          className="demo-input"
        />
      </label>
    </>
  )
}

function VideoRow({ video }: { video: Video }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(video.title)
  const [url, setUrl] = useState(video.url)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!parseYouTubeId(url)) return setError('Not a valid YouTube URL.')
    setBusy(true)
    try {
      await updateVideo({ data: { id: video.id, title, url } })
      setEditing(false)
      setError(null)
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete “${video.title}”?`)) return
    await deleteVideo({ data: { id: video.id } })
    await router.invalidate()
  }

  function handleCancel() {
    setTitle(video.title)
    setUrl(video.url)
    setError(null)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-line px-4 py-3">
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <VideoFields
            url={url}
            title={title}
            onUrlChange={setUrl}
            onTitleChange={setTitle}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="demo-button text-xs py-1.5 px-3"
              aria-label="Save video"
            >
              <Check className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="demo-button demo-button-secondary text-xs py-1.5 px-3"
              aria-label="Cancel editing"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
        {error && <p className="m-0 mt-2 text-xs text-red-500">{error}</p>}
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-line px-3 py-2 text-sm">
      <img
        src={`https://i.ytimg.com/vi/${video.youtubeId}/default.jpg`}
        alt=""
        loading="lazy"
        className="h-10 w-16 flex-shrink-0 rounded-md object-cover"
      />
      <span className="min-w-0 flex-1">
        <strong className="block truncate">{video.title}</strong>
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-ink-soft"
        >
          {video.youtubeId} <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="demo-button demo-button-secondary text-xs py-1.5 px-3"
        aria-label={`Edit video ${video.title}`}
      >
        <Pencil className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className="demo-button text-xs py-1.5 px-3"
        aria-label={`Delete video ${video.title}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </li>
  )
}

export function VideosAdmin({ videos }: { videos: Video[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!parseYouTubeId(url)) return setError('Not a valid YouTube URL.')
    setBusy(true)
    try {
      await createVideo({ data: { title, url } })
      setTitle('')
      setUrl('')
      setError(null)
      await router.invalidate()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="demo-panel p-5 flex flex-col gap-4">
      <div>
        <h2 className="m-0 mb-1 font-display text-xl font-bold text-ink">
          Videos
        </h2>
        <p className="m-0 text-xs text-ink-soft">
          YouTube links shown on the Videos page.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
        <VideoFields
          url={url}
          title={title}
          onUrlChange={setUrl}
          onTitleChange={setTitle}
        />
        <button type="submit" disabled={busy} className="demo-button">
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </form>
      {error && (
        <p role="alert" className="m-0 text-xs text-red-500">
          {error}
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {videos.length === 0 && (
          <li className="text-sm text-ink-soft">No videos yet.</li>
        )}
        {videos.map((v) => (
          <VideoRow key={v.id} video={v} />
        ))}
      </ul>
    </section>
  )
}
