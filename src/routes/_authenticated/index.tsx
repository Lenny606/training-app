import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { listPlans } from '../../server/plans'
import { useWorkoutSession, getPersistedPlanId } from '../../hooks/useWorkoutSession'
import { WorkoutPlanSelector } from '../../components/workout/WorkoutPlanSelector'
import { TimerDisplay } from '../../components/workout/TimerDisplay'
import { NextActivityCard } from '../../components/workout/NextActivityCard'

export const Route = createFileRoute('/_authenticated/')({
  component: App,
  loader: () => listPlans(),
  // `?plan=<id>` lets the assistant's start_workout tool deep-link to a plan.
  validateSearch: (search): { plan?: string } => ({
    plan: typeof search.plan === 'string' ? search.plan : undefined,
  }),
})

export default function App() {
  const plans = Route.useLoaderData()
  const { plan: planParam } = Route.useSearch()
  const initialPlanId =
    planParam && plans.some((p) => p.id === planParam) ? planParam : (plans[0]?.id ?? '')
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)

  // After mount (post-hydration → SSR-safe), reselect the plan from a persisted
  // session so a refresh mid-workout restores the right plan and timer. An
  // explicit `?plan=` (e.g. from the assistant) wins over the persisted session.
  useEffect(() => {
    if (planParam) return
    const persistedId = getPersistedPlanId()
    if (persistedId && persistedId !== selectedPlanId && plans.some((p) => p.id === persistedId)) {
      setSelectedPlanId(persistedId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const {
    currentActivityIndex,
    secondsRemaining,
    isPlaying,
    isCompleted,
    handleSkipForward,
    handleSkipBackward,
    handlePlayPause,
    handleStop,
  } = useWorkoutSession({ selectedPlan, soundEnabled })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName))
      ) {
        return
      }
      e.preventDefault()
      handlePlayPause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlePlayPause])

  const currentActivity = selectedPlan?.activities[currentActivityIndex]
  const nextActivity = selectedPlan?.activities[currentActivityIndex + 1]

  return (
    <main className="page-wrap px-4 py-6 sm:py-10 max-w-lg mx-auto flex flex-col gap-6">
      <WorkoutPlanSelector
        plans={plans}
        selectedPlanId={selectedPlanId}
        soundEnabled={soundEnabled}
        onPlanChange={setSelectedPlanId}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
      />

      <TimerDisplay
        selectedPlan={selectedPlan}
        currentActivity={currentActivity}
        currentActivityIndex={currentActivityIndex}
        secondsRemaining={secondsRemaining}
        isCompleted={isCompleted}
        isPlaying={isPlaying}
        onSkipBackward={handleSkipBackward}
        onPlayPause={handlePlayPause}
        onStop={handleStop}
        onSkipForward={handleSkipForward}
      />

      {selectedPlan && selectedPlan.activities.length > 0 && (
        <NextActivityCard nextActivity={nextActivity} isCompleted={isCompleted} />
      )}
    </main>
  )
}
