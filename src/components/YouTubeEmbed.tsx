import { useState } from 'react'
import { Play } from 'lucide-react'

interface YouTubeEmbedProps {
  youtubeId: string
  title: string
}

/**
 * Click-to-load YouTube player: renders only the thumbnail until played, so a
 * page full of videos doesn't load a heavy iframe per video. Uses the
 * privacy-enhanced youtube-nocookie domain. Playback starts muted.
 */
export function YouTubeEmbed({ youtubeId, title }: YouTubeEmbedProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-black">
      {playing ? (
        <iframe
          // Starts muted (also lets autoplay through on mobile); the user
          // unmutes in the player. fs=1 keeps the fullscreen button.
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&fs=1&playsinline=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer border-0 p-0 focus-visible:ring-2 focus-visible:outline-none"
        >
          <img
            src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-110">
              <Play className="h-6 w-6 translate-x-0.5" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
