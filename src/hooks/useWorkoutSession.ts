import { useState, useEffect, useRef } from 'react'
import type { TrainingPlan } from '../domain/plans'
import { playTimerBeep, playWorkoutCompleteBeep } from '../utils/audio'
import { useWakeLock } from './useWakeLock'

interface UseWorkoutSessionOptions {
  selectedPlan: TrainingPlan | undefined
  soundEnabled: boolean
}


export function useWorkoutSession({ selectedPlan, soundEnabled }: UseWorkoutSessionOptions) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(0)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)

  const selectedPlanId = selectedPlan?.id || ''

  // Reset session when plan changes
  useEffect(() => {
    setCurrentActivityIndex(0)
    setIsPlaying(false)
    setIsCompleted(false)
    const initialDuration = selectedPlan?.activities?.[0]?.duration || 0
    setSecondsRemaining(initialDuration)
  }, [selectedPlanId])

  const currentActivityIndexRef = useRef(currentActivityIndex)
  currentActivityIndexRef.current = currentActivityIndex

  const selectedPlanRef = useRef(selectedPlan)
  selectedPlanRef.current = selectedPlan

  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled

  const jumpToActivity = (index: number, plan: typeof selectedPlan, beep = true) => {
    if (!plan) return
    setCurrentActivityIndex(index)
    setSecondsRemaining(plan.activities[index].duration)
    setIsCompleted(false)
    if (soundEnabled && beep) playTimerBeep(true)
  }

  const completeWorkout = (withSound = true) => {
    setIsPlaying(false)
    setIsCompleted(true)
    if (withSound && soundEnabled) playWorkoutCompleteBeep()
  }

  const handleNextActivity = () => {
    const plan = selectedPlanRef.current
    if (!plan) return
    const nextIdx = currentActivityIndexRef.current + 1
    if (nextIdx < plan.activities.length) {
      jumpToActivity(nextIdx, plan, false)
    } else {
      setIsPlaying(false)
      setIsCompleted(true)
      if (soundEnabledRef.current) playWorkoutCompleteBeep()
    }
  }

  const handleSkipForward = () => {
    if (!selectedPlan) return
    const lastIdx = selectedPlan.activities.length - 1
    if (currentActivityIndex >= lastIdx) {
      completeWorkout()
    } else {
      jumpToActivity(currentActivityIndex + 1, selectedPlan)
    }
  }

  const handleSkipBackward = () => {
    if (!selectedPlan || currentActivityIndex <= 0) return
    jumpToActivity(currentActivityIndex - 1, selectedPlan)
  }

  // fallow-ignore-next-line complexity
  const handlePlayPause = () => {
    const activities = selectedPlan?.activities || []
    if (activities.length === 0) return
    if (soundEnabled) playTimerBeep(false)
    if (isCompleted) {
      jumpToActivity(0, selectedPlan, false)
      setIsPlaying(true)
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const handleStop = () => {
    setIsPlaying(false)
    setCurrentActivityIndex(0)
    setIsCompleted(false)
    const duration = selectedPlan?.activities?.[0]?.duration || 0
    setSecondsRemaining(duration)
    if (soundEnabled) playTimerBeep(false)
  }

  // Keep the screen awake while a workout is actively running.
  useWakeLock(isPlaying && !isCompleted)

  useEffect(() => {
    if (!isPlaying || isCompleted) return
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev > 1) return prev - 1
        if (soundEnabledRef.current) playTimerBeep(true)
        setTimeout(handleNextActivity, 0)
        return 0
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, isCompleted])

  return {
    currentActivityIndex,
    secondsRemaining,
    isPlaying,
    isCompleted,
    handleSkipForward,
    handleSkipBackward,
    handlePlayPause,
    handleStop,
  }
}

