import { useState } from 'react'
import {
  Image as ImageIcon,
  Film,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Activity, Media } from '../../domain/plans'

interface CurrentActivityInfoProps {
  isCompleted: boolean
  planName: string
  currentActivity: Activity | undefined
}

// fallow-ignore-next-line complexity
function ActivityMetadata({ activity }: { activity: Activity }) {
  if (activity.type === 'learning') {
    return (
      <div className="text-center mt-2 px-4 py-3 bg-purple-500/5 border border-purple-500/15 rounded-xl text-xs text-ink-soft italic">
        {activity.description || 'No instruction description provided.'}
      </div>
    )
  }

  if (activity.type !== 'exercise') return null

  const items = [
    activity.sets ? `${activity.sets} Sets` : '',
    activity.reps ? `${activity.reps} Reps` : '',
    activity.weight || '',
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-1.5">
      {items.map((text, idx) => (
        <span key={idx} className="demo-pill text-2xs py-0.5 px-2">
          {text}
        </span>
      ))}
    </div>
  )
}

function ActivityMediaGallery({ media }: { media: Media[] }) {
  const [activeMedia, setActiveMedia] = useState<Media | null>(null)

  if (!media || media.length === 0) return null

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeMedia) return
    const currentIndex = media.findIndex((m) => m.id === activeMedia.id)
    const prevIndex = (currentIndex - 1 + media.length) % media.length
    setActiveMedia(media[prevIndex])
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeMedia) return
    const currentIndex = media.findIndex((m) => m.id === activeMedia.id)
    const nextIndex = (currentIndex + 1) % media.length
    setActiveMedia(media[nextIndex])
  }

  return (
    <div className="mt-4 w-full">
      <div className="flex gap-2.5 overflow-x-auto pb-1 px-1 scrollbar-thin scrollbar-thumb-lagoon/20 scrollbar-track-transparent snap-x justify-center">
        {media.map((item) => {
          const isVideo = item.mimeType?.startsWith('video/')
          const mediaUrl = `/uploads/${item.fileName}`

          return (
            <button
              key={item.id}
              onClick={() => setActiveMedia(item)}
              className="relative flex-shrink-0 w-28 h-20 rounded-xl overflow-hidden border border-line bg-chip/40 hover:scale-103 active:scale-98 transition-all focus:outline-none focus:ring-1 focus:ring-lagoon snap-start cursor-pointer shadow-sm group"
              aria-label={isVideo ? `Preview video ${item.originalName}` : `View image ${item.originalName}`}
            >
              {isVideo ? (
                <div className="w-full h-full relative">
                  <video
                    src={mediaUrl}
                    muted
                    loop
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded-sm px-1 py-0.5 text-5xs text-white flex items-center gap-0.5 font-bold">
                    <Film className="h-1.5 w-1.5" />
                    <span>PREVIEW</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <img
                    src={mediaUrl}
                    alt={item.originalName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm rounded-sm px-1 py-0.5 text-5xs text-white flex items-center gap-0.5 font-bold">
                    <ImageIcon className="h-1.5 w-1.5" />
                    <span>VIEW</span>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {activeMedia && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-200"
          onClick={() => setActiveMedia(null)}
        >
          <button
            onClick={() => setActiveMedia(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer z-55"
            aria-label="Close lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative max-w-4xl max-h-80vh w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {media.length > 1 && (
              <button
                onClick={handlePrev}
                className="absolute left-0 -translate-x-4 sm:-translate-x-12 p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer z-55"
                aria-label="Previous media"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {activeMedia.mimeType?.startsWith('video/') ? (
              <video
                src={`/uploads/${activeMedia.fileName}`}
                controls
                autoPlay
                playsInline
                loop
                className="max-w-full max-h-75vh object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            ) : (
              <img
                src={`/uploads/${activeMedia.fileName}`}
                alt={activeMedia.originalName}
                className="max-w-full max-h-75vh object-contain rounded-2xl shadow-2xl border border-white/10"
              />
            )}

            {media.length > 1 && (
              <button
                onClick={handleNext}
                className="absolute right-0 translate-x-4 sm:translate-x-12 p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer z-55"
                aria-label="Next media"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-white/80 text-sm font-semibold m-0 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-sm max-w-md truncate">
              {activeMedia.originalName}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function CurrentActivityInfo({
  isCompleted,
  planName,
  currentActivity,
}: CurrentActivityInfoProps) {
  if (isCompleted) {
    return (
      <div className="flex flex-col gap-1 items-center">
        <h2 className="m-0 font-display text-xl font-extrabold text-lagoon animate-bounce">
          Session Complete!
        </h2>
        <p className="text-xs text-ink-soft m-0">
          Excellent work completing the {planName} routine.
        </p>
      </div>
    )
  }

  if (!currentActivity) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs tracking-widest font-black uppercase text-lagoon">
        CURRENT ACTIVITY
      </span>
      <h2 className="m-0 font-display text-xl font-black text-ink">
        {currentActivity.name}
      </h2>
      <ActivityMetadata activity={currentActivity} />
      {currentActivity.media && currentActivity.media.length > 0 && (
        <ActivityMediaGallery media={currentActivity.media} />
      )}
    </div>
  )
}
