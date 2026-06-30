import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Dumbbell,
  Timer,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { getStoredPlans } from '../utils/plans'
import type { TrainingPlan } from '../utils/plans'
import { formatTime } from '../utils/time'

export const Route = createFileRoute('/')({ component: App })

// Web Audio API beep synthesizer
function playTimerBeep(highPitch = false) {
  if (typeof window === 'undefined') return
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(highPitch ? 1200 : 880, audioCtx.currentTime)
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime)

    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
    osc.stop(audioCtx.currentTime + 0.35)
  } catch (e) {
    console.warn('Audio feedback failed (user interaction required first):', e)
  }
}

// Special success sound (3 consecutive quick high-pitched beeps)
function playWorkoutCompleteBeep() {
  if (typeof window === 'undefined') return
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const playBeepAt = (timeDelay: number, freq: number) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + timeDelay)
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime + timeDelay)
      osc.start(audioCtx.currentTime + timeDelay)
      gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + timeDelay + 0.15)
      osc.stop(audioCtx.currentTime + timeDelay + 0.18)
    }
    playBeepAt(0.0, 987.77) // B5
    playBeepAt(0.2, 1046.50) // C6
    playBeepAt(0.4, 1318.51) // E6
  } catch (e) {
    console.warn('Audio play complete failed:', e)
  }
}

function App() {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number>(0)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isCompleted, setIsCompleted] = useState<boolean>(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  const selectedPlan = plans.find((p) => p.id === selectedPlanId)
  const currentActivity = selectedPlan?.activities[currentActivityIndex]
  const nextActivity = selectedPlan?.activities[currentActivityIndex + 1]

  // Ref to hold the current plans for callbacks
  const plansRef = useRef(plans)
  plansRef.current = plans
  
  const selectedPlanIdRef = useRef(selectedPlanId)
  selectedPlanIdRef.current = selectedPlanId

  const currentActivityIndexRef = useRef(currentActivityIndex)
  currentActivityIndexRef.current = currentActivityIndex

  // Load plans from local storage
  useEffect(() => {
    const stored = getStoredPlans()
    setPlans(stored)
    if (stored.length > 0) {
      setSelectedPlanId(stored[0].id)
      if (stored[0].activities.length > 0) {
        setSecondsRemaining(stored[0].activities[0].duration)
      }
    }
  }, [])

  // Handle plan change
  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId)
    setCurrentActivityIndex(0)
    setIsPlaying(false)
    setIsCompleted(false)
    
    const plan = plans.find((p) => p.id === planId)
    if (plan && plan.activities.length > 0) {
      setSecondsRemaining(plan.activities[0].duration)
    } else {
      setSecondsRemaining(0)
    }
  }

  // Next activity logic
  const handleNextActivity = () => {
    const plan = plansRef.current.find((p) => p.id === selectedPlanIdRef.current)
    if (!plan) return

    const nextIdx = currentActivityIndexRef.current + 1
    if (nextIdx < plan.activities.length) {
      setCurrentActivityIndex(nextIdx)
      setSecondsRemaining(plan.activities[nextIdx].duration)
      setIsCompleted(false)
    } else {
      // Workout complete!
      setIsPlaying(false)
      setIsCompleted(true)
      if (soundEnabled) {
        playWorkoutCompleteBeep()
      }
    }
  }

  // Skip forward trigger (manually)
  const handleSkipForward = () => {
    if (!selectedPlan) return
    if (currentActivityIndex < selectedPlan.activities.length - 1) {
      setCurrentActivityIndex((prev) => prev + 1)
      setSecondsRemaining(selectedPlan.activities[currentActivityIndex + 1].duration)
      setIsCompleted(false)
      if (soundEnabled) playTimerBeep(true)
    } else {
      // Last activity completed
      setIsPlaying(false)
      setIsCompleted(true)
      if (soundEnabled) playWorkoutCompleteBeep()
    }
  }

  // Skip backward trigger (manually)
  const handleSkipBackward = () => {
    if (!selectedPlan) return
    if (currentActivityIndex > 0) {
      setCurrentActivityIndex((prev) => prev - 1)
      setSecondsRemaining(selectedPlan.activities[currentActivityIndex - 1].duration)
      setIsCompleted(false)
      if (soundEnabled) playTimerBeep(true)
    }
  }

  // Play / Pause toggle
  const handlePlayPause = () => {
    if (!selectedPlan || selectedPlan.activities.length === 0) return
    
    if (isCompleted) {
      // Restart workout
      setCurrentActivityIndex(0)
      setSecondsRemaining(selectedPlan.activities[0].duration)
      setIsCompleted(false)
      setIsPlaying(true)
    } else {
      setIsPlaying((prev) => !prev)
    }
    if (soundEnabled) playTimerBeep(false)
  }

  // Stop / Reset workout
  const handleStop = () => {
    setIsPlaying(false)
    setCurrentActivityIndex(0)
    setIsCompleted(false)
    if (selectedPlan && selectedPlan.activities.length > 0) {
      setSecondsRemaining(selectedPlan.activities[0].duration)
    } else {
      setSecondsRemaining(0)
    }
    if (soundEnabled) playTimerBeep(false)
  }

  // Timer interval hook
  useEffect(() => {
    let interval: any = null
    if (isPlaying && !isCompleted) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Sound beep alert
            if (soundEnabled) {
              playTimerBeep(true)
            }
            // Transition to next exercise
            setTimeout(() => {
              handleNextActivity()
            }, 0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, isCompleted, soundEnabled])

  // Calculate circular SVG progress properties
  const totalDuration = currentActivity?.duration || 1
  const progressRatio = Math.max(0, Math.min(1, secondsRemaining / totalDuration))
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - progressRatio * circumference


  return (
    <main className="page-wrap px-4 py-6 sm:py-10 max-w-lg mx-auto flex flex-col gap-6">
      
      {/* Selection of training plan */}
      <section className="demo-panel p-4 rounded-2xl rise-in flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--sea-ink-soft)] flex items-center gap-1.5">
            <Dumbbell className="h-4 w-4 text-[var(--lagoon)]" />
            Training Plan
          </label>
          
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition-all ${
              soundEnabled
                ? 'border-[var(--line)] bg-[rgba(0,240,255,0.06)] text-[var(--lagoon)]'
                : 'border-transparent bg-transparent text-[var(--sea-ink-soft)]'
            }`}
            title={soundEnabled ? 'Mute Beeps' : 'Enable Beeps'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedPlanId}
            onChange={(e) => handlePlanChange(e.target.value)}
            className="demo-select font-display font-bold text-sm bg-slate-900/90 text-white flex-grow cursor-pointer"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <Link
            to="/admin"
            className="demo-button demo-button-secondary p-2.5 rounded-xl border border-[var(--line)] hover:bg-[rgba(0,240,255,0.06)] text-[var(--sea-ink)] flex items-center justify-center"
            title="Configure Plans"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Main Timer Display */}
      <section className="demo-panel p-6 rounded-[2.5rem] rise-in shadow-[0_22px_50px_rgba(0,240,255,0.05)] relative overflow-hidden flex flex-col items-center justify-center gap-6">
        
        {/* Decorative background aura */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.04),transparent_60%)]" />

        {selectedPlan && selectedPlan.activities.length > 0 ? (
          <>
            {/* Circular Progress Timer */}
            <div className="relative w-64 h-64 flex items-center justify-center select-none">
              <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 240 240">
                {/* Background Ring */}
                <circle
                  cx="120"
                  cy="120"
                  r={radius}
                  className="stroke-[rgba(255,255,255,0.03)] fill-none stroke-[8]"
                />
                {/* Glowing Colored Ring */}
                <circle
                  cx="120"
                  cy="120"
                  r={radius}
                  className="fill-none stroke-[8] transition-all duration-1000 ease-linear"
                  stroke={currentActivity?.type === 'rest' ? '#0ea5e9' : 'var(--lagoon)'}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 6px ${
                      currentActivity?.type === 'rest' ? 'rgba(14,165,233,0.35)' : 'rgba(0,240,255,0.35)'
                    })`
                  }}
                />
              </svg>

              {/* Central Text Widget */}
              <div className="text-center flex flex-col items-center justify-center z-10">
                <span className="text-[10px] tracking-[0.25em] font-black uppercase text-[var(--sea-ink-soft)] mb-0.5">
                  {isCompleted
                    ? 'DONE'
                    : currentActivity?.type === 'rest'
                    ? 'REST INTERVAL'
                    : 'SET WORK'}
                </span>
                
                <span className="font-display text-5xl font-black tracking-tighter text-[var(--sea-ink)] leading-none select-all">
                  {isCompleted ? '00:00' : formatTime(secondsRemaining)}
                </span>
                
                <span className="text-[10px] text-[var(--sea-ink-soft)] font-mono mt-1 px-2.5 py-0.5 border border-[var(--line)] bg-[rgba(255,255,255,0.02)] rounded-full">
                  Step {currentActivityIndex + 1} of {selectedPlan.activities.length}
                </span>
              </div>
            </div>

            {/* Current Activity Widget */}
            <div className="text-center w-full z-10">
              {isCompleted ? (
                <div className="flex flex-col gap-1 items-center">
                  <h2 className="m-0 font-display text-xl font-extrabold text-[var(--lagoon)] animate-bounce">
                    Session Complete!
                  </h2>
                  <p className="text-xs text-[var(--sea-ink-soft)] m-0">
                    Excellent work completing the {selectedPlan.name} routine.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] tracking-widest font-black uppercase text-[var(--lagoon)]">
                    CURRENT ACTIVITY
                  </span>
                  <h2 className="m-0 font-display text-xl font-black text-[var(--sea-ink)]">
                    {currentActivity?.name}
                  </h2>
                  {currentActivity?.type === 'exercise' && (
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      {currentActivity.sets && (
                        <span className="demo-pill text-[10px] py-0.5 px-2 bg-slate-900 border-[var(--line)]">
                          {currentActivity.sets} Sets
                        </span>
                      )}
                      {currentActivity.reps && (
                        <span className="demo-pill text-[10px] py-0.5 px-2 bg-slate-900 border-[var(--line)]">
                          {currentActivity.reps} Reps
                        </span>
                      )}
                      {currentActivity.weight && (
                        <span className="demo-pill text-[10px] py-0.5 px-2 bg-slate-900 border-[var(--line)]">
                          {currentActivity.weight}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Start/Pause and Stop Playback Controls */}
            <div className="flex items-center gap-4 z-10">
              <button
                onClick={handleSkipBackward}
                disabled={currentActivityIndex === 0}
                className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-white disabled:opacity-30"
                title="Previous Activity"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={handlePlayPause}
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
                onClick={handleStop}
                className="p-3 rounded-2xl border border-red-950 bg-red-950/20 text-red-400 hover:bg-red-950/40"
                title="Stop / Reset Workout"
              >
                <RotateCcw className="h-5 w-5" />
              </button>

              <button
                onClick={handleSkipForward}
                disabled={currentActivityIndex === selectedPlan.activities.length - 1 && isCompleted}
                className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] hover:text-white disabled:opacity-30"
                title="Next Activity"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>
          </>
        ) : (
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
        )}
      </section>

      {/* Next Activity Preview Card */}
      {selectedPlan && selectedPlan.activities.length > 0 && !isCompleted && (
        <section className="demo-card rise-in p-4 border border-[var(--line)] bg-[rgba(255,255,255,0.01)] flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase tracking-widest font-black text-[var(--sea-ink-soft)]">
              NEXT UP
            </span>
            <h3 className="m-0 font-display text-sm font-extrabold text-[var(--sea-ink)]">
              {nextActivity ? nextActivity.name : 'Workout Finished'}
            </h3>
            <p className="text-[11px] text-[var(--sea-ink-soft)] m-0">
              {nextActivity
                ? `${nextActivity.type === 'rest' ? 'Rest Period' : 'Exercise Session'} — ${formatTime(
                    nextActivity.duration
                  )}`
                : 'Congratulations on completing your routine!'}
            </p>
          </div>
          {nextActivity && (
            <div className="flex-shrink-0 flex items-center gap-1 bg-[rgba(0,240,255,0.05)] border border-[var(--line)] rounded-xl py-1.5 px-2.5 text-xs text-[var(--lagoon)]">
              <Timer className="h-3.5 w-3.5" />
              <span className="font-mono font-bold">{nextActivity.duration}s</span>
            </div>
          )}
        </section>
      )}

    </main>
  )
}
