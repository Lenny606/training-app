import { Link, createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { listVideos } from '../../server/videos'
import { YouTubeEmbed } from '../../components/YouTubeEmbed'
import { youTubeWatchUrl } from '../../utils/youtube'

export const Route = createFileRoute('/_authenticated/videos')({
  loader: () => listVideos(),
  component: Videos,
})

function Videos() {
  const videos = Route.useLoaderData()

  return (
    <main className="page-wrap py-6 sm:py-12">
      <div className="mx-auto max-w-2xl lg:max-w-none">
        <div className="mb-4 flex items-baseline justify-between gap-3 sm:mb-6">
          <h1 className="m-0 font-display text-2xl font-bold text-ink">
            Videos
          </h1>
          {videos.length > 0 && (
            <span className="text-xs font-semibold text-ink-soft">
              {videos.length} {videos.length === 1 ? 'video' : 'videos'}
            </span>
          )}
        </div>
        {videos.length === 0 ? (
          <div className="demo-panel p-8 text-center text-sm text-ink-soft">
            No videos yet — add some in{' '}
            <Link to="/admin" className="text-lagoon-deep">
              Administration
            </Link>
            .
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:gap-5 lg:grid-cols-2">
            {videos.map((v) => (
              <li
                key={v.id}
                className="demo-panel flex flex-col gap-2 p-2 sm:gap-3 sm:p-3"
              >
                <YouTubeEmbed youtubeId={v.youtubeId} title={v.title} />
                <div className="flex items-start justify-between gap-3 px-1 pb-1">
                  <h2 className="m-0 min-w-0 text-sm font-semibold leading-snug text-ink">
                    {v.title}
                  </h2>
                  <a
                    href={youTubeWatchUrl(v.youtubeId)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-ink-soft no-underline hover:text-ink"
                    aria-label={`Open ${v.title} on YouTube`}
                  >
                    YouTube
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
