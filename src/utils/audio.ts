// Audio Context helper
function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  const w = window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }
  return w.AudioContext || w.webkitAudioContext || null
}

// Web Audio API beep synthesizer
export function playTimerBeep(highPitch = false) {
  const AudioCtxClass = getAudioContextClass()
  if (!AudioCtxClass) return
  try {
    const audioCtx = new AudioCtxClass()
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
export function playWorkoutCompleteBeep() {
  const AudioCtxClass = getAudioContextClass()
  if (!AudioCtxClass) return
  try {
    const audioCtx = new AudioCtxClass()
    const playBeepAt = (timeDelay: number, freq: number) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + timeDelay)
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime + timeDelay)
      osc.start(audioCtx.currentTime + timeDelay)
      gain.gain.exponentialRampToValueAtTime(
        0.005,
        audioCtx.currentTime + timeDelay + 0.15,
      )
      osc.stop(audioCtx.currentTime + timeDelay + 0.18)
    }
    playBeepAt(0.0, 987.77) // B5
    playBeepAt(0.2, 1046.5) // C6
    playBeepAt(0.4, 1318.51) // E6
  } catch (e) {
    console.warn('Audio play complete failed:', e)
  }
}
