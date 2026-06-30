import { Link } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import type { TrainingPlan, Activity } from '../../domain/plans'
import { ProgressCircle } from './ProgressCircle'
import { CurrentActivityInfo } from './CurrentActivityInfo'
import { PlaybackControls } from './PlaybackControls'

interface TimerDisplayProps {
  selectedPlan: TrainingPlan | undefined
  currentActivity: Activity | undefined
  currentActivityIndex: number
  secondsRemaining: number
  isCompleted: boolean
  isPlaying: boolean
  onSkipBackward: () => void
  onPlayPause: () => void
  onStop: () => void
  onSkipForward: () => void
}

function EmptyTimerDisplay() {
  return (
    <section className="demo-panel p-6 rounded-[2.5rem] rise-in shadow-[0_22px_50px_rgba(0,240,255,0.05)] relative overflow-hidden flex flex-col items-center justify-center gap-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.04),transparent_60%)]" />
      <div className="text-center py-10">
        <Settings className="h-8 w-8 text-[var(--sea-ink-soft)] mx-auto mb-3 animate-spin" />
        <h3 className="m-0 text-sm font-bold text-[var(--sea-ink)] mb-2">
          No Activities Defined
        </h3>
        <p className="text-xs text-[var(--sea-ink-soft)] max-w-xs mb-4">
          This plan has no activities. Head to the administration screen to set some up.
        </p>
        <Link to="/admin" className="demo-button text-xs py-1.5 px-3">
          Go to Plan Builder
        </Link>
      </div>
    </section>
  )
}

function getTimerMetrics(secondsRemaining: number, currentActivity: Activity | undefined) {
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const totalDuration = currentActivity?.duration || 1
  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / totalDuration))
  const strokeDashoffset = circumference - progressRatio * circumference
  return { radius, circumference, strokeDashoffset }
}

function getNavigationStates(
  currentActivityIndex: number,
  activitiesCount: number,
  isCompleted: boolean
) {
  return {
    canSkipBackward: currentActivityIndex > 0,
    canSkipForward: !(currentActivityIndex === activitiesCount - 1 && isCompleted),
  }
}

export function TimerDisplay({
  selectedPlan,
  currentActivity,
  currentActivityIndex,
  secondsRemaining,
  isCompleted,
  isPlaying,
  onSkipBackward,
  onPlayPause,
  onStop,
  onSkipForward,
}: TimerDisplayProps) {
  if (!selectedPlan || selectedPlan.activities.length === 0) {
    return <EmptyTimerDisplay />
  }

  const { radius, circumference, strokeDashoffset } = getTimerMetrics(secondsRemaining, currentActivity)
  const { canSkipBackward, canSkipForward } = getNavigationStates(
    currentActivityIndex,
    selectedPlan.activities.length,
    isCompleted
  )

  return (
    <section className="demo-panel p-6 rounded-[2.5rem] rise-in shadow-[0_22px_50px_rgba(0,240,255,0.05)] relative overflow-hidden flex flex-col items-center justify-center gap-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.04),transparent_60%)]" />

      <ProgressCircle
        radius={radius}
        circumference={circumference}
        strokeDashoffset={strokeDashoffset}
        type={currentActivity?.type}
        isCompleted={isCompleted}
        secondsRemaining={secondsRemaining}
        currentActivityIndex={currentActivityIndex}
        totalActivities={selectedPlan.activities.length}
      />

      <div className="text-center w-full z-10">
        <CurrentActivityInfo
          isCompleted={isCompleted}
          planName={selectedPlan.name}
          currentActivity={currentActivity}
        />
      </div>

      <PlaybackControls
        isPlaying={isPlaying}
        canSkipBackward={canSkipBackward}
        canSkipForward={canSkipForward}
        onSkipBackward={onSkipBackward}
        onPlayPause={onPlayPause}
        onStop={onStop}
        onSkipForward={onSkipForward}
      />
    </section>
  )
}
