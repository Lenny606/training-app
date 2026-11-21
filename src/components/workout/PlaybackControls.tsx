import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface PlaybackControlsProps {
  isPlaying: boolean
  canSkipBackward: boolean
  canSkipForward: boolean
  soundEnabled: boolean
  onSkipBackward: () => void
  onPlayPause: () => void
  onStop: () => void
  onSkipForward: () => void
  onToggleSound: () => void
}

const SIDE_BUTTON_CLASS =
  'inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-chip text-ink-soft hover:text-ink active:scale-95 disabled:opacity-30 disabled:active:scale-100'

const UTILITY_BUTTON_CLASS =
  'inline-flex h-11 w-11 items-center justify-center rounded-full active:scale-95'

export function PlaybackControls({
  isPlaying,
  canSkipBackward,
  canSkipForward,
  soundEnabled,
  onSkipBackward,
  onPlayPause,
  onStop,
  onSkipForward,
  onToggleSound,
}: PlaybackControlsProps) {
  return (
    <div className="flex w-full items-center justify-between gap-2 z-10">
      <button
        onClick={onStop}
        className={`${UTILITY_BUTTON_CLASS} text-ink-soft hover:bg-danger/10 hover:text-danger`}
        title="Stop / Reset Workout"
        aria-label="Stop / Reset Workout"
      >
        <RotateCcw className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onSkipBackward}
          disabled={!canSkipBackward}
          className={SIDE_BUTTON_CLASS}
          title="Previous Activity"
          aria-label="Previous Activity"
        >
          <SkipBack className="h-5 w-5" />
        </button>

        <button
          onClick={onPlayPause}
          className={`inline-flex h-20 w-20 items-center justify-center rounded-full border shadow-lg active:scale-95 ${
            isPlaying
              ? 'border-amber-500 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400'
              : 'border-lagoon-deep bg-lagoon-deep text-lagoon-ink shadow-glow-lagoon-strong hover:scale-103'
          }`}
          title={isPlaying ? 'Pause Session' : 'Start Session'}
          aria-label={isPlaying ? 'Pause Session' : 'Start Session'}
        >
          {isPlaying ? (
            <Pause className="h-8 w-8 fill-current" />
          ) : (
            <Play className="h-8 w-8 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={onSkipForward}
          disabled={!canSkipForward}
          className={SIDE_BUTTON_CLASS}
          title="Next Activity"
          aria-label="Next Activity"
        >
          <SkipForward className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={onToggleSound}
        className={`${UTILITY_BUTTON_CLASS} hover:bg-link-hover ${
          soundEnabled ? 'text-lagoon-deep' : 'text-ink-soft hover:text-ink'
        }`}
        title={soundEnabled ? 'Mute Beeps' : 'Enable Beeps'}
        aria-label={soundEnabled ? 'Mute Beeps' : 'Enable Beeps'}
        aria-pressed={soundEnabled}
      >
        {soundEnabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </button>
    </div>
  )
}
