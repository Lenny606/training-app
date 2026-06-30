import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { planRepository } from '../repositories'
import type { TrainingPlan } from '../domain/plans'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { WorkoutPlanSelector } from '../components/workout/WorkoutPlanSelector'
import { TimerDisplay } from '../components/workout/TimerDisplay'
import { NextActivityCard } from '../components/workout/NextActivityCard'

export const Route = createFileRoute('/')({ component: App })

export default function App() {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  useEffect(() => {
    planRepository.list().then((loadedPlans) => {
      setPlans(loadedPlans)
      if (loadedPlans.length > 0) {
        setSelectedPlanId(loadedPlans[0].id)
      }
    })
  }, [])

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  
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
