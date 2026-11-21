import { Link } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import type { TrainingPlan, Activity } from '../../domain/plans'
import { ProgressCircle } from './ProgressCircle'
import { CurrentActivityInfo } from './CurrentActivityInfo'
import { PlaybackControls } from './PlaybackControls'
import { WorkoutProgress } from './WorkoutProgress'

interface TimerDisplayProps {
  selectedPlan: TrainingPlan | undefined
  currentActivity: Activity | undefined
  currentActivityIndex: number
  secondsRemaining: number
  isCompleted: boolean
  isPlaying: boolean
  soundEnabled: boolean
  onSkipBackward: () => void
  onPlayPause: () => void
  onStop: () => void
  onSkipForward: () => void
  onToggleSound: () => void
}

const TIMER_PANEL_CLASS =
  'demo-panel p-5 sm:p-6 rounded-4xl rise-in shadow-timer relative overflow-hidden flex flex-col items-center justify-center gap-6'

const TIMER_PANEL_GLOW_CLASS =
  'pointer-events-none absolute inset-0 bg-timer-glow'

function EmptyTimerDisplay() {
  return (
    <section className={TIMER_PANEL_CLASS}>
      <div className={TIMER_PANEL_GLOW_CLASS} />
      <div className="z-10 flex flex-col items-center py-10 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-chip text-ink-soft">
          <ClipboardList className="h-6 w-6" aria-hidden />
        </span>
        <h3 className="m-0 mb-1.5 font-display text-lg font-bold text-ink">
          No activities yet
        </h3>
        <p className="m-0 mb-5 max-w-xs text-sm text-ink-soft">
          This plan is empty. Add exercises and rest blocks in the plan builder
          to start a session.
        </p>
        <Link to="/admin" className="demo-button demo-button-primary">
          Go to Plan Builder
        </Link>
      </div>
    </section>
  )
}

function getTimerMetrics(
  secondsRemaining: number,
  currentActivity: Activity | undefined,
) {
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const totalDuration = currentActivity?.duration || 1
  const progressRatio = Math.max(
    0,
    Math.min(1, secondsRemaining / totalDuration),
  )
  const strokeDashoffset = circumference - progressRatio * circumference
  return { radius, circumference, strokeDashoffset }
}

function getNavigationStates(
  currentActivityIndex: number,
  activitiesCount: number,
  isCompleted: boolean,
) {
  return {
    canSkipBackward: currentActivityIndex > 0,
    canSkipForward: !(
      currentActivityIndex === activitiesCount - 1 && isCompleted
    ),
  }
}

export function TimerDisplay({
  selectedPlan,
  currentActivity,
  currentActivityIndex,
  secondsRemaining,
  isCompleted,
  isPlaying,
  soundEnabled,
  onSkipBackward,
  onPlayPause,
  onStop,
  onSkipForward,
  onToggleSound,
}: TimerDisplayProps) {
  if (!selectedPlan || selectedPlan.activities.length === 0) {
    return <EmptyTimerDisplay />
  }

  const { radius, circumference, strokeDashoffset } = getTimerMetrics(
    secondsRemaining,
    currentActivity,
  )
  const { canSkipBackward, canSkipForward } = getNavigationStates(
    currentActivityIndex,
    selectedPlan.activities.length,
    isCompleted,
  )

  return (
    <section className={TIMER_PANEL_CLASS}>
      <div className={TIMER_PANEL_GLOW_CLASS} />

      <WorkoutProgress
        planName={selectedPlan.name}
        activities={selectedPlan.activities}
        currentActivityIndex={currentActivityIndex}
        secondsRemaining={secondsRemaining}
        isCompleted={isCompleted}
      />

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
        soundEnabled={soundEnabled}
        onSkipBackward={onSkipBackward}
        onPlayPause={onPlayPause}
        onStop={onStop}
        onSkipForward={onSkipForward}
        onToggleSound={onToggleSound}
      />
    </section>
  )
}
