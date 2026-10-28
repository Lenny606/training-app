import { Link, createFileRoute } from '@tanstack/react-router'
import { listVideos } from '../../server/videos'
import { YouTubeEmbed } from '../../components/YouTubeEmbed'

export const Route = createFileRoute('/_authenticated/videos')({
  loader: () => listVideos(),
  component: Videos,
})

function Videos() {
  const videos = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 py-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="m-0 mb-4 font-display text-2xl font-bold text-ink sm:mb-6">
          Videos
        </h1>
        {videos.length === 0 ? (
          <div className="demo-panel p-8 text-center text-sm text-ink-soft">
            No videos yet — add some in{' '}
            <Link to="/admin" className="text-lagoon-deep">
              Administration
            </Link>
            .
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0 sm:gap-6">
            {videos.map((v) => (
              <li
                key={v.id}
                className="demo-panel flex flex-col gap-2 p-2 sm:gap-3 sm:p-3"
              >
                <YouTubeEmbed youtubeId={v.youtubeId} title={v.title} />
                <h2 className="m-0 px-1 text-sm font-semibold text-ink">
                  {v.title}
                </h2>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
