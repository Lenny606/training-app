import { useState, useEffect, useRef } from 'react'
import type { TrainingPlan } from '../domain/plans'
import { playTimerBeep, playWorkoutCompleteBeep } from '../utils/audio'
import { useWakeLock } from './useWakeLock'

interface UseWorkoutSessionOptions {
  selectedPlan: TrainingPlan | undefined
  soundEnabled: boolean
}

const STORAGE_KEY = 'workout-session-v1'

interface PersistedSession {
  planId: string
  activityIndex: number
  isPlaying: boolean
  isCompleted: boolean
  /** Epoch ms when the current activity ends — only meaningful while playing. */
  endsAt: number | null
  /** Seconds left in the current activity — used when paused. */
  remaining: number
}

function loadPersisted(): PersistedSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

/** Plan id of a persisted session, so the page can reselect it on load. */
export function getPersistedPlanId(): string | null {
  return loadPersisted()?.planId ?? null
}

interface ReconciledState {
  activityIndex: number
  secondsRemaining: number
  isPlaying: boolean
  isCompleted: boolean
  endsAt: number | null
}

/**
 * Given a persisted session and the wall-clock `now`, work out where the timer
 * should be — fast-forwarding through any activities that elapsed while the page
 * was closed, and completing the workout if it ran past the end.
 */
function reconcile(
  p: PersistedSession,
  plan: TrainingPlan,
  now: number,
): ReconciledState {
  if (p.isCompleted) {
    return {
      activityIndex: p.activityIndex,
      secondsRemaining: 0,
      isPlaying: false,
      isCompleted: true,
      endsAt: null,
    }
  }
  if (!p.isPlaying || p.endsAt == null) {
    return {
      activityIndex: p.activityIndex,
      secondsRemaining: p.remaining,
      isPlaying: false,
      isCompleted: false,
      endsAt: null,
    }
  }

  let activityIndex = p.activityIndex
  let endsAt = p.endsAt
  while (endsAt <= now) {
    const nextIdx = activityIndex + 1
    if (nextIdx >= plan.activities.length) {
      return {
        activityIndex,
        secondsRemaining: 0,
        isPlaying: false,
        isCompleted: true,
        endsAt: null,
      }
    }
    activityIndex = nextIdx
    endsAt += plan.activities[nextIdx].duration * 1000
  }
  return {
    activityIndex,
    secondsRemaining: Math.max(0, Math.round((endsAt - now) / 1000)),
    isPlaying: true,
    isCompleted: false,
    endsAt,
  }
}

export function useWorkoutSession({
  selectedPlan,
  soundEnabled,
}: UseWorkoutSessionOptions) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(0)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    () => selectedPlan?.activities?.[0]?.duration || 0,
  )
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)

  const selectedPlanId = selectedPlan?.id || ''

  const endsAtRef = useRef<number | null>(null)

  const currentActivityIndexRef = useRef(currentActivityIndex)
  currentActivityIndexRef.current = currentActivityIndex

  const secondsRemainingRef = useRef(secondsRemaining)
  secondsRemainingRef.current = secondsRemaining

  const selectedPlanRef = useRef(selectedPlan)
  selectedPlanRef.current = selectedPlan

  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled

  // Reset the session only on an actual plan change — not on the initial mount,
  // and not when we're switching to the plan we're about to restore.
  const prevPlanIdRef = useRef<string>(
    loadPersisted()?.planId ?? selectedPlanId,
  )
  useEffect(() => {
    if (prevPlanIdRef.current === selectedPlanId) return
    prevPlanIdRef.current = selectedPlanId
    setCurrentActivityIndex(0)
    setIsPlaying(false)
    setIsCompleted(false)
    endsAtRef.current = null
    setSecondsRemaining(selectedPlan?.activities?.[0]?.duration || 0)
  }, [selectedPlanId, selectedPlan])

  // Restore a persisted session after mount (post-hydration → SSR-safe). Runs
  // once, when the selected plan matches the persisted one. Defined after the
  // reset effect so it wins if both fire on the same render.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    const p = loadPersisted()
    if (!p || !selectedPlan || p.planId !== selectedPlan.id) return
    restoredRef.current = true
    const r = reconcile(p, selectedPlan, Date.now())
    setCurrentActivityIndex(r.activityIndex)
    setSecondsRemaining(r.secondsRemaining)
    setIsCompleted(r.isCompleted)
    endsAtRef.current = r.endsAt
    setIsPlaying(r.isPlaying)
  }, [selectedPlanId, selectedPlan])

  const jumpToActivity = (
    index: number,
    plan: typeof selectedPlan,
    beep = true,
  ) => {
    if (!plan) return
    setCurrentActivityIndex(index)
    setSecondsRemaining(plan.activities[index].duration)
    setIsCompleted(false)
    if (soundEnabled && beep) playTimerBeep(true)
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

  const handleNextActivityRef = useRef(handleNextActivity)
  handleNextActivityRef.current = handleNextActivity

  const handleSkipForward = () => {
    if (!selectedPlan) return
    const lastIdx = selectedPlan.activities.length - 1
    if (currentActivityIndex >= lastIdx) {
      setIsPlaying(false)
      setIsCompleted(true)
      if (soundEnabled) playWorkoutCompleteBeep()
    } else {
      jumpToActivity(currentActivityIndex + 1, selectedPlan)
    }
  }

  const handleSkipBackward = () => {
    if (!selectedPlan || currentActivityIndex <= 0) return
    jumpToActivity(currentActivityIndex - 1, selectedPlan)
  }

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
    endsAtRef.current = null
    setSecondsRemaining(selectedPlan?.activities?.[0]?.duration || 0)
    if (soundEnabled) playTimerBeep(false)
  }

  // Anchor a wall-clock deadline whenever we start/resume or move to a new
  // activity, so the countdown is time-based (and survives refresh) rather than
  // a fragile per-second decrement.
  useEffect(() => {
    if (isPlaying && !isCompleted) {
      endsAtRef.current = Date.now() + secondsRemainingRef.current * 1000
    } else {
      endsAtRef.current = null
    }
  }, [isPlaying, isCompleted, currentActivityIndex])

  // Keep the screen awake while a workout is actively running.
  useWakeLock(isPlaying && !isCompleted)

  useEffect(() => {
    if (!isPlaying || isCompleted) return
    const tick = () => {
      const endsAt = endsAtRef.current
      if (endsAt == null) return
      const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
      if (remaining <= 0) {
        endsAtRef.current = null // guard against a double-advance before re-render
        setSecondsRemaining(0)
        if (soundEnabledRef.current) playTimerBeep(true)
        handleNextActivityRef.current()
      } else {
        setSecondsRemaining(remaining)
      }
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [isPlaying, isCompleted, currentActivityIndex])

  // Persist on every meaningful change. `endsAt` (a ref) is read here; the
  // deadline effect above runs first on shared deps, so it's up to date.
  useEffect(() => {
    if (typeof window === 'undefined' || !selectedPlan) return
    const data: PersistedSession = {
      planId: selectedPlan.id,
      activityIndex: currentActivityIndex,
      isPlaying,
      isCompleted,
      endsAt: isPlaying ? endsAtRef.current : null,
      remaining: secondsRemaining,
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // storage full / unavailable — ignore
    }
  }, [
    selectedPlanId,
    selectedPlan,
    currentActivityIndex,
    isPlaying,
    isCompleted,
    secondsRemaining,
  ])

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
