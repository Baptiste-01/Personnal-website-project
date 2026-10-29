/**
 * Web Audio API Sound Synthesizer Engine
 * 100% autonomous, zero external assets, instant response, zero latency.
 */

type SoundListener = (muted: boolean) => void

class SoundManager {
  private ctx: AudioContext | null = null
  private muted: boolean = false
  private volume: number = 0.5
  private listeners: Set<SoundListener> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      const storedMute = localStorage.getItem('smik_audio_muted')
      this.muted = storedMute === 'true'
      const storedVol = localStorage.getItem('smik_audio_volume')
      if (storedVol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(storedVol)))
      }
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  public isMuted(): boolean {
    return this.muted
  }

  public setMuted(muted: boolean): void {
    this.muted = muted
    if (typeof window !== 'undefined') {
      localStorage.setItem('smik_audio_muted', String(muted))
    }
    this.listeners.forEach(fn => fn(this.muted))
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  public subscribe(listener: SoundListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol))
    if (typeof window !== 'undefined') {
      localStorage.setItem('smik_audio_volume', String(this.volume))
    }
  }

  public getVolume(): number {
    return this.volume
  }

  /** Subtle UI button tap / select */
  public playClick(): void {
    if (this.muted) return
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04)

    gain.gain.setValueAtTime(0.12 * this.volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.05)
  }

  /** Standard clock tick */
  public playTick(): void {
    if (this.muted) return
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(450, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.03)

    gain.gain.setValueAtTime(0.08 * this.volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.04)
  }

  /** Urgent warning tick for last 5 seconds */
  public playWarning(): void {
    if (this.muted) return
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'square'
    osc.frequency.setValueAtTime(880, now) // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.04) // D6

    gain.gain.setValueAtTime(0.12 * this.volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.09)
  }

  /** Correct answer melodic arpeggio */
  public playCorrect(): void {
    if (this.muted) return
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    const noteDuration = 0.07

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const startTime = now + idx * noteDuration

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.2 * this.volume, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.2)
    })
  }

  /** Wrong answer buzzer */
  public playWrong(): void {
    if (this.muted) return
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, now)
    osc.frequency.linearRampToValueAtTime(80, now + 0.25)

    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, now)

    gain.gain.setValueAtTime(0.22 * this.volume, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.28)
  }

  /** Victorious fanfare upon winning or completing game */
  public playVictory(): void {
    if (this.muted) return
    const ctx = this.initContext()
    if (!ctx) return

    const now = ctx.currentTime
    // Triumphant fanfare: C5, E5, G5, high C6 chord
    const sequence = [
      { f: 523.25, t: 0.0, d: 0.12 },
      { f: 523.25, t: 0.14, d: 0.12 },
      { f: 523.25, t: 0.28, d: 0.12 },
      { f: 659.25, t: 0.42, d: 0.25 },
      { f: 783.99, t: 0.70, d: 0.25 },
      { f: 1046.50, t: 0.98, d: 0.55 },
    ]

    sequence.forEach(({ f, t, d }) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + t

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, start)

      gain.gain.setValueAtTime(0.25 * this.volume, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + d)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + d + 0.02)
    })
  }
}

export const soundManager = new SoundManager()

