import { Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react'

interface PlaybackControlsProps {
  isPlaying: boolean
  canSkipBackward: boolean
  canSkipForward: boolean
  onSkipBackward: () => void
  onPlayPause: () => void
  onStop: () => void
  onSkipForward: () => void
}

export function PlaybackControls({
  isPlaying,
  canSkipBackward,
  canSkipForward,
  onSkipBackward,
  onPlayPause,
  onStop,
  onSkipForward,
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 z-10">
      <button
        onClick={onSkipBackward}
        disabled={!canSkipBackward}
        className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-white disabled:opacity-30"
        title="Previous Activity"
      >
        <SkipBack className="h-5 w-5" />
      </button>

      <button
        onClick={onPlayPause}
        className={`p-5 rounded-full border flex items-center justify-center shadow-lg transition-all active:scale-95 ${
          isPlaying
            ? 'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            : 'border-[var(--lagoon)] bg-[rgba(0,240,255,0.12)] text-[var(--lagoon)] hover:bg-[rgba(0,240,255,0.22)] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
        }`}
        title={isPlaying ? 'Pause Session' : 'Start Session'}
      >
        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current ml-0.5" />}
      </button>

      <button
        onClick={onStop}
        className="p-3 rounded-2xl border border-red-950 bg-red-950/20 text-red-400 hover:bg-red-950/40"
        title="Stop / Reset Workout"
      >
        <RotateCcw className="h-5 w-5" />
      </button>

      <button
        onClick={onSkipForward}
        disabled={!canSkipForward}
        className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-white disabled:opacity-30"
        title="Next Activity"
      >
        <SkipForward className="h-5 w-5" />
      </button>
    </div>
  )
}
