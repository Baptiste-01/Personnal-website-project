import { useState, useEffect, useRef } from 'react'
import './ArcadeBackground.css'

export type ArcadeBackgroundVariant = 'home' | 'speedsmik'

interface ActiveObstacle {
  id: number
  type: string
}

type SaltoVariant = 'frontflip' | 'backflip'

interface ArcadeBackgroundProps {
  variant?: ArcadeBackgroundVariant
}

export default function ArcadeBackground({ variant = 'home' }: ArcadeBackgroundProps) {
  const [obstacles, setObstacles] = useState<ActiveObstacle[]>([])
  const [jumpVariant, setJumpVariant] = useState<SaltoVariant | null>(null)
  const nextId = useRef(1)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    setObstacles([])
    setJumpVariant(null)
    const timers: Array<ReturnType<typeof setTimeout>> = []

    const horizontalPool = ['beetle', 'pipe', 'spikes', 'pit']
    const verticalPool = ['wall-spikes', 'wall-pipe', 'wall-drone', 'wall-laser']
    const obstaclePool = variant === 'speedsmik' ? verticalPool : horizontalPool

    const spawnObstacle = () => {
      if (!isMounted.current) return

      const obsId = nextId.current++
      const randomType = obstaclePool[Math.floor(Math.random() * obstaclePool.length)]
      const newObs: ActiveObstacle = { id: obsId, type: randomType }

      // 1. Mount obstacle
      setObstacles(prev => [...prev.slice(-3), newObs])

      // 2. Trigger synchronized salto jump as obstacle approaches the hero
      const jumpDelay = variant === 'speedsmik' ? 820 : 350
      const jumpTimer = setTimeout(() => {
        if (!isMounted.current) return
        const v: SaltoVariant = Math.random() > 0.5 ? 'frontflip' : 'backflip'
        setJumpVariant(v)

        // Reset jump after completion (650ms duration)
        const landTimer = setTimeout(() => {
          if (!isMounted.current) return
          setJumpVariant(null)
        }, 650)
        timers.push(landTimer)
      }, jumpDelay)
      timers.push(jumpTimer)

      // 3. Remove obstacle once scrolled past (2.8s)
      const cleanTimer = setTimeout(() => {
        if (!isMounted.current) return
        setObstacles(prev => prev.filter(o => o.id !== obsId))
      }, 2800)
      timers.push(cleanTimer)

      // 4. Schedule next random obstacle (2.8s to 4.6s interval)
      const nextDelay = 2800 + Math.random() * 1800
      const nextTimer = setTimeout(spawnObstacle, nextDelay)
      timers.push(nextTimer)
    }

    // Initial launch after 1s
    const initTimer = setTimeout(spawnObstacle, 1000)
    timers.push(initTimer)

    return () => {
      isMounted.current = false
      timers.forEach(t => clearTimeout(t))
    }
  }, [variant])

  return (
    <div className={`arcade-bg-scene arcade-bg-scene--${variant}`} aria-hidden="true">
      {/* ─── Layer 0: Matrix Grid & Stars ─── */}
      <div className="arcade-bg-grid" />
      <div className="arcade-bg-stars" />

      {/* ─── Layer 1: Retro Pixel Clouds (Parallax Sky) ─── */}
      <div className="ab-cloud ab-cloud--1">
        <svg viewBox="0 0 28 12" width="112" height="48" shapeRendering="crispEdges">
          <rect x="8" y="0" width="8" height="2" fill="rgba(255, 255, 255, 0.09)" />
          <rect x="4" y="2" width="16" height="2" fill="rgba(255, 255, 255, 0.11)" />
          <rect x="2" y="4" width="22" height="2" fill="rgba(255, 255, 255, 0.13)" />
          <rect x="0" y="6" width="26" height="4" fill="rgba(255, 255, 255, 0.12)" />
          <rect x="2" y="10" width="24" height="2" fill="rgba(255, 255, 255, 0.08)" />
        </svg>
      </div>

      <div className="ab-cloud ab-cloud--2">
        <svg viewBox="0 0 22 10" width="88" height="40" shapeRendering="crispEdges">
          <rect x="6" y="0" width="6" height="2" fill="rgba(255, 255, 255, 0.07)" />
          <rect x="3" y="2" width="12" height="2" fill="rgba(255, 255, 255, 0.09)" />
          <rect x="1" y="4" width="18" height="4" fill="rgba(255, 255, 255, 0.10)" />
          <rect x="2" y="8" width="16" height="2" fill="rgba(255, 255, 255, 0.06)" />
        </svg>
      </div>

      {/* ─── Layer 2: Space Invader Patrol (Upper Atmosphere) ─── */}
      <div className="ab-invader-flight">
        <svg viewBox="0 0 11 8" width="28" height="20" className="ab-invader-sprite" shapeRendering="crispEdges">
          <rect x="2" y="0" width="1" height="1" fill="currentColor"/>
          <rect x="8" y="0" width="1" height="1" fill="currentColor"/>
          <rect x="3" y="1" width="1" height="1" fill="currentColor"/>
          <rect x="7" y="1" width="1" height="1" fill="currentColor"/>
          <rect x="2" y="2" width="7" height="1" fill="currentColor"/>
          <rect x="1" y="3" width="2" height="1" fill="currentColor"/>
          <rect x="4" y="3" width="3" height="1" fill="currentColor"/>
          <rect x="8" y="3" width="2" height="1" fill="currentColor"/>
          <rect x="0" y="4" width="11" height="1" fill="currentColor"/>
          <rect x="0" y="5" width="1" height="1" fill="currentColor"/>
          <rect x="2" y="5" width="7" height="1" fill="currentColor"/>
          <rect x="10" y="5" width="1" height="1" fill="currentColor"/>
          <rect x="0" y="6" width="1" height="1" fill="currentColor"/>
          <rect x="2" y="6" width="1" height="1" fill="currentColor"/>
          <rect x="8" y="6" width="1" height="1" fill="currentColor"/>
          <rect x="10" y="6" width="1" height="1" fill="currentColor"/>
          <rect x="3" y="7" width="2" height="1" fill="currentColor"/>
          <rect x="6" y="7" width="2" height="1" fill="currentColor"/>
        </svg>
      </div>

      {/* ─── Layer 3: Floating Mario Question Block [?] with Coin (Top Right) ─── */}
      <div className="ab-mario-block-anchor">
        <div className="ab-coin">
          <svg viewBox="0 0 8 10" width="16" height="20" shapeRendering="crispEdges">
            <rect x="2" y="0" width="4" height="1" fill="#fde047" />
            <rect x="1" y="1" width="6" height="1" fill="#fde047" />
            <rect x="0" y="2" width="8" height="6" fill="#eab308" />
            <rect x="2" y="3" width="2" height="4" fill="#fef08a" />
            <rect x="5" y="3" width="1" height="4" fill="#ca8a04" />
            <rect x="1" y="8" width="6" height="1" fill="#ca8a04" />
            <rect x="2" y="9" width="4" height="1" fill="#ca8a04" />
          </svg>
        </div>
        <div className="ab-question-box">
          <svg viewBox="0 0 16 16" width="36" height="36" shapeRendering="crispEdges">
            <rect x="0" y="0" width="16" height="16" fill="#ea580c" />
            <rect x="1" y="1" width="14" height="14" fill="#f59e0b" />
            <rect x="1" y="1" width="14" height="1" fill="#fde68a" />
            <rect x="1" y="1" width="1" height="14" fill="#fde68a" />
            <rect x="1" y="14" width="14" height="1" fill="#b45309" />
            <rect x="14" y="1" width="1" height="14" fill="#b45309" />
            <rect x="2" y="2" width="1" height="1" fill="#78350f" />
            <rect x="13" y="2" width="1" height="1" fill="#78350f" />
            <rect x="2" y="13" width="1" height="1" fill="#78350f" />
            <rect x="13" y="13" width="1" height="1" fill="#78350f" />
            <rect x="5" y="4" width="6" height="2" fill="#ffffff" />
            <rect x="9" y="5" width="2" height="3" fill="#ffffff" />
            <rect x="7" y="7" width="3" height="2" fill="#ffffff" />
            <rect x="7" y="9" width="2" height="1" fill="#ffffff" />
            <rect x="7" y="11" width="2" height="2" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* ─── Layer 4: Combat Duel at Bottom Left ─── */}
      {variant === 'speedsmik' ? (
        /* SpeedSmik Combat: Cyber Knight vs Void Sorcerer */
        <div className="ab-combat-bottom-left ab-combat-bottom-left--speedsmik">
          <div className="ab-fighter ab-fighter--knight">
            <svg viewBox="0 0 20 24" width="40" height="48" shapeRendering="crispEdges">
              <rect x="7" y="0" width="3" height="3" fill="#38bdf8" />
              <rect x="6" y="2" width="2" height="2" fill="#0ea5e9" />
              <rect x="5" y="3" width="7" height="6" fill="#94a3b8" />
              <rect x="4" y="5" width="9" height="3" fill="#cbd5e1" />
              <rect x="8" y="6" width="5" height="1" fill="#38bdf8" />
              <rect x="9" y="6" width="3" height="1" fill="#ffffff" />
              <rect x="2" y="9" width="4" height="4" fill="#64748b" />
              <rect x="11" y="9" width="4" height="4" fill="#94a3b8" />
              <rect x="5" y="9" width="7" height="6" fill="#cbd5e1" />
              <rect x="7" y="10" width="3" height="3" fill="#06b6d4" />
              <rect x="8" y="11" width="1" height="1" fill="#ffffff" />
              <rect x="13" y="4" width="2" height="11" fill="#38bdf8" />
              <rect x="14" y="5" width="1" height="9" fill="#ffffff" />
              <rect x="12" y="15" width="4" height="1" fill="#cbd5e1" />
              <rect x="13" y="16" width="2" height="3" fill="#475569" />
              <rect x="13" y="19" width="2" height="1" fill="#0284c7" />
              <rect x="1" y="11" width="3" height="6" fill="#0284c7" />
              <rect x="2" y="12" width="1" height="4" fill="#38bdf8" />
              <rect x="5" y="15" width="7" height="2" fill="#475569" />
              <rect x="5" y="17" width="3" height="2" fill="#64748b" />
              <rect x="9" y="17" width="3" height="2" fill="#64748b" />
              <rect x="4" y="19" width="3" height="3" fill="#94a3b8" />
              <rect x="10" y="19" width="3" height="3" fill="#94a3b8" />
              <rect x="3" y="22" width="4" height="2" fill="#cbd5e1" />
              <rect x="10" y="22" width="4" height="2" fill="#cbd5e1" />
              <rect x="4" y="23" width="2" height="1" fill="#06b6d4" />
              <rect x="11" y="23" width="2" height="1" fill="#06b6d4" />
            </svg>
          </div>

          <div className="ab-duel-energy">
            <svg viewBox="0 0 24 14" width="48" height="28" shapeRendering="crispEdges">
              <rect x="4" y="3" width="16" height="8" fill="#a855f7" />
              <rect x="6" y="4" width="12" height="6" fill="#c084fc" />
              <rect x="8" y="5" width="8" height="4" fill="#ffffff" />
              <rect x="0" y="5" width="4" height="4" fill="#38bdf8" />
              <rect x="2" y="6" width="3" height="2" fill="#ffffff" />
              <rect x="18" y="2" width="3" height="3" fill="#f43f5e" />
              <rect x="18" y="9" width="3" height="3" fill="#f43f5e" />
              <rect x="21" y="4" width="3" height="6" fill="#ec4899" />
            </svg>
          </div>

          <div className="ab-fighter ab-fighter--sorcerer">
            <svg viewBox="0 0 20 24" width="40" height="48" shapeRendering="crispEdges">
              <rect x="2" y="0" width="3" height="4" fill="#ec4899" />
              <rect x="3" y="1" width="1" height="2" fill="#fdf2f8" />
              <rect x="1" y="4" width="5" height="2" fill="#7c3aed" />
              <rect x="3" y="6" width="1" height="16" fill="#4c1d95" />
              <rect x="8" y="2" width="7" height="3" fill="#3b0764" />
              <rect x="7" y="4" width="9" height="6" fill="#4c1d95" />
              <rect x="8" y="5" width="6" height="4" fill="#090514" />
              <rect x="9" y="6" width="2" height="1" fill="#ef4444" />
              <rect x="12" y="6" width="2" height="1" fill="#ef4444" />
              <rect x="9" y="6" width="1" height="1" fill="#fecaca" />
              <rect x="12" y="6" width="1" height="1" fill="#fecaca" />
              <rect x="6" y="10" width="11" height="5" fill="#581c87" />
              <rect x="7" y="11" width="9" height="3" fill="#7c3aed" />
              <rect x="10" y="11" width="3" height="2" fill="#a855f7" />
              <rect x="5" y="11" width="2" height="2" fill="#c084fc" />
              <rect x="4" y="10" width="2" height="2" fill="#f43f5e" />
              <rect x="7" y="15" width="9" height="6" fill="#3b0764" />
              <rect x="8" y="16" width="7" height="4" fill="#2e1065" />
              <rect x="6" y="21" width="11" height="2" fill="#1e1035" />
              <rect x="5" y="23" width="13" height="1" fill="#090514" />
            </svg>
          </div>
        </div>
      ) : (
        /* Home Combat: Martial Arts Gi Fighter with Hadouken vs Rival Ninja */
        <div className="ab-combat-bottom-left ab-combat-bottom-left--home">
          <div className="ab-fighter ab-fighter--hero">
            <svg viewBox="0 0 18 22" width="36" height="44" shapeRendering="crispEdges">
              <rect x="4" y="3" width="9" height="2" fill="#ef4444" />
              <rect x="1" y="4" width="3" height="1" fill="#dc2626" />
              <rect x="5" y="0" width="8" height="3" fill="#18181b" />
              <rect x="3" y="1" width="3" height="3" fill="#18181b" />
              <rect x="13" y="1" width="3" height="3" fill="#18181b" />
              <rect x="4" y="2" width="10" height="2" fill="#18181b" />
              <rect x="5" y="5" width="7" height="4" fill="#fed7aa" />
              <rect x="7" y="6" width="2" height="1" fill="#18181b" />
              <rect x="4" y="8" width="9" height="6" fill="#f8fafc" />
              <rect x="6" y="8" width="5" height="4" fill="#fed7aa" />
              <rect x="4" y="14" width="9" height="2" fill="#0f172a" />
              <rect x="10" y="15" width="2" height="3" fill="#0f172a" />
              <rect x="3" y="16" width="4" height="4" fill="#f8fafc" />
              <rect x="10" y="16" width="4" height="4" fill="#f8fafc" />
              <rect x="2" y="20" width="4" height="2" fill="#fed7aa" />
              <rect x="11" y="20" width="4" height="2" fill="#fed7aa" />
            </svg>
          </div>

          <div className="ab-hadouken">
            <svg viewBox="0 0 20 12" width="40" height="24" shapeRendering="crispEdges">
              <rect x="4" y="0" width="10" height="12" fill="var(--color-accent, #3b82f6)" />
              <rect x="6" y="2" width="8" height="8" fill="var(--color-accent-hover, #60a5fa)" />
              <rect x="8" y="4" width="4" height="4" fill="#ffffff" />
              <rect x="0" y="4" width="4" height="4" fill="var(--color-accent, #3b82f6)" />
              <rect x="14" y="2" width="4" height="2" fill="var(--color-accent-hover, #60a5fa)" />
              <rect x="14" y="8" width="4" height="2" fill="var(--color-accent-hover, #60a5fa)" />
              <rect x="18" y="5" width="2" height="2" fill="#ffffff" />
            </svg>
          </div>

          <div className="ab-fighter ab-fighter--rival">
            <svg viewBox="0 0 16 20" width="32" height="40" shapeRendering="crispEdges">
              <rect x="4" y="0" width="8" height="4" fill="#312e81" />
              <rect x="5" y="4" width="6" height="2" fill="#fed7aa" />
              <rect x="8" y="4" width="1" height="1" fill="#e11d48" />
              <rect x="4" y="6" width="8" height="7" fill="#4338ca" />
              <rect x="12" y="6" width="3" height="2" fill="#e11d48" />
              <rect x="4" y="13" width="8" height="1" fill="#fbbf24" />
              <rect x="2" y="8" width="3" height="3" fill="#fed7aa" />
              <rect x="4" y="14" width="3" height="4" fill="#312e81" />
              <rect x="9" y="14" width="3" height="4" fill="#312e81" />
              <rect x="3" y="18" width="3" height="2" fill="#1e1b4b" />
              <rect x="9" y="18" width="4" height="2" fill="#1e1b4b" />
            </svg>
          </div>
        </div>
      )}

      {/* ─── Layer 5: Discrete Bottom Pixel Skyline ─── */}
      <div className="ab-pixel-skyline" />

      {/* ─── Layer 6: Dynamic Zone (SpeedSmik = Vertical Wall-Slide, Home = Horizontal Ground Runner) ─── */}
      {variant === 'speedsmik' ? (
        /* SpeedSmik: Vertical Wall-Slide along Cyber Wall */
        <div className="ab-vertical-wall-zone">
          <div className="ab-vertical-wall-rail" />

          {obstacles.map(obs => (
            <div key={obs.id} className={`ab-wall-obstacle ab-wall-obstacle--${obs.type}`}>
              {obs.type === 'wall-spikes' && (
                <svg viewBox="0 0 24 32" width="28" height="36" shapeRendering="crispEdges">
                  <rect x="18" y="0" width="6" height="32" fill="#334155" />
                  <rect x="17" y="2" width="1" height="28" fill="#475569" />
                  <rect x="0" y="4" width="4" height="2" fill="#ef4444" />
                  <rect x="4" y="3" width="5" height="4" fill="#f87171" />
                  <rect x="9" y="2" width="5" height="6" fill="#cbd5e1" />
                  <rect x="14" y="1" width="4" height="8" fill="#64748b" />
                  <rect x="2" y="16" width="4" height="2" fill="#ef4444" />
                  <rect x="6" y="15" width="5" height="4" fill="#f87171" />
                  <rect x="11" y="14" width="4" height="6" fill="#cbd5e1" />
                  <rect x="15" y="13" width="3" height="8" fill="#64748b" />
                  <rect x="0" y="26" width="4" height="2" fill="#ef4444" />
                  <rect x="4" y="25" width="5" height="4" fill="#f87171" />
                  <rect x="9" y="24" width="5" height="6" fill="#cbd5e1" />
                  <rect x="14" y="23" width="4" height="8" fill="#64748b" />
                </svg>
              )}

              {obs.type === 'wall-pipe' && (
                <svg viewBox="0 0 26 26" width="32" height="32" shapeRendering="crispEdges">
                  <rect x="20" y="2" width="6" height="22" fill="#15803d" />
                  <rect x="19" y="4" width="2" height="18" fill="#86efac" />
                  <rect x="6" y="6" width="14" height="14" fill="#15803d" />
                  <rect x="8" y="8" width="10" height="10" fill="#22c55e" />
                  <rect x="0" y="8" width="6" height="10" fill="#166534" />
                  <rect x="0" y="10" width="4" height="6" fill="#86efac" />
                  <rect x="2" y="11" width="2" height="4" fill="#ffffff" />
                </svg>
              )}

              {obs.type === 'wall-drone' && (
                <svg viewBox="0 0 22 22" width="28" height="28" shapeRendering="crispEdges">
                  <rect x="16" y="2" width="6" height="18" fill="#78350f" />
                  <rect x="18" y="4" width="4" height="14" fill="#b45309" />
                  <rect x="4" y="5" width="12" height="12" fill="#d97706" />
                  <rect x="6" y="7" width="8" height="8" fill="#f59e0b" />
                  <rect x="2" y="8" width="4" height="6" fill="#dc2626" />
                  <rect x="1" y="9" width="3" height="4" fill="#ef4444" />
                  <rect x="1" y="10" width="1" height="2" fill="#ffffff" />
                  <rect x="14" y="0" width="3" height="4" fill="#78350f" />
                  <rect x="14" y="18" width="3" height="4" fill="#78350f" />
                </svg>
              )}

              {obs.type === 'wall-laser' && (
                <svg viewBox="0 0 28 20" width="36" height="26" shapeRendering="crispEdges">
                  <rect x="22" y="0" width="6" height="20" fill="#1e1b4b" />
                  <rect x="20" y="3" width="2" height="14" fill="#4338ca" />
                  <rect x="12" y="5" width="8" height="10" fill="#6366f1" />
                  <rect x="10" y="7" width="2" height="6" fill="#a5b4fc" />
                  <rect x="0" y="8" width="10" height="4" fill="#38bdf8" />
                  <rect x="2" y="9" width="8" height="2" fill="#ffffff" />
                  <rect x="0" y="6" width="3" height="8" fill="#ec4899" />
                </svg>
              )}
            </div>
          ))}

          <div className={`ab-wall-hero ${jumpVariant ? `ab-wall-hero--jumping-${jumpVariant}` : ''}`}>
            <div className="ab-wall-hero-sprite">
              <svg viewBox="0 0 26 30" width="52" height="60" shapeRendering="crispEdges">
                <rect x="6" y="0" width="8" height="2" fill="#ffffff" />
                <rect x="4" y="1" width="11" height="2" fill="#ffffff" />
                <rect x="3" y="2" width="13" height="3" fill="#ffffff" />
                <rect x="16" y="2" width="3" height="2" fill="#ffffff" />
                <rect x="2" y="3" width="4" height="4" fill="#ffffff" />
                <rect x="2" y="4" width="2" height="3" fill="#e2e8f0" />
                <rect x="3" y="6" width="3" height="2" fill="#e2e8f0" />
                <rect x="6" y="2" width="4" height="1" fill="#e2e8f0" />
                <rect x="11" y="2" width="4" height="1" fill="#e2e8f0" />
                <rect x="14" y="4" width="2" height="2" fill="#ffffff" />
                <rect x="15" y="5" width="2" height="2" fill="#ffffff" />
                <rect x="5" y="5" width="10" height="5" fill="#fed7aa" />
                <rect x="7" y="10" width="6" height="2" fill="#fed7aa" />
                <rect x="4" y="6" width="1" height="2" fill="#fbcfe8" />
                <rect x="10" y="5" width="3" height="1" fill="#94a3b8" />
                <rect x="10" y="6" width="3" height="2" fill="#ffffff" />
                <rect x="11" y="6" width="2" height="2" fill="#78350f" />
                <rect x="11" y="6" width="1" height="1" fill="#ffffff" />
                <rect x="14" y="8" width="1" height="1" fill="#fca5a5" />
                <rect x="12" y="9" width="2" height="1" fill="#f43f5e" />
                <rect x="6" y="11" width="8" height="1" fill="#d6d3d1" />
                <rect x="7" y="11" width="6" height="1" fill="#f5f5f4" />
                <rect x="5" y="12" width="11" height="6" fill="#f5f5f4" />
                <rect x="4" y="12" width="2" height="6" fill="#e7e5e4" />
                <rect x="7" y="14" width="7" height="3" fill="#e7e5e4" />
                <rect x="8" y="15" width="5" height="2" fill="#f5f5f4" />
                <rect x="7" y="14" width="1" height="2" fill="#d6d3d1" />
                <rect x="13" y="14" width="1" height="2" fill="#d6d3d1" />
                <rect x="5" y="18" width="11" height="1" fill="#d6d3d1" />
                <rect x="2" y="13" width="3" height="3" fill="#d6d3d1" />
                <rect x="1" y="15" width="2" height="2" fill="#fed7aa" />
                <rect x="16" y="13" width="3" height="3" fill="#f5f5f4" />
                <rect x="18" y="14" width="3" height="3" fill="#fed7aa" />
                <rect x="5" y="19" width="11" height="1" fill="#1e40af" />
                <rect x="5" y="20" width="11" height="2" fill="#2563eb" />
                <rect x="4" y="20" width="3" height="2" fill="#1d4ed8" />
                <rect x="4" y="22" width="5" height="2" fill="#1d4ed8" />
                <rect x="5" y="24" width="5" height="2" fill="#2563eb" />
                <rect x="6" y="26" width="4" height="1" fill="#1d4ed8" />
                <rect x="12" y="21" width="5" height="2" fill="#2563eb" />
                <rect x="14" y="22" width="3" height="2" fill="#3b82f6" />
                <rect x="15" y="24" width="4" height="2" fill="#2563eb" />
                <rect x="17" y="26" width="3" height="1" fill="#1d4ed8" />
                <rect x="6" y="27" width="5" height="2" fill="#ffffff" />
                <rect x="5" y="28" width="6" height="1" fill="#0f172a" />
                <rect x="18" y="26" width="5" height="2" fill="#ffffff" />
                <rect x="19" y="26" width="3" height="1" fill="#2563eb" />
                <rect x="18" y="28" width="6" height="1" fill="#0f172a" />
              </svg>

              <div className={`ab-wall-sparks ${jumpVariant ? 'ab-wall-sparks--hidden' : ''}`}>
                <div className="ab-spark ab-spark--1" />
                <div className="ab-spark ab-spark--2" />
                <div className="ab-spark ab-spark--3" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Home: Horizontal Ground Runner at Bottom Right */
        <div className="ab-bottom-runner-zone">
          <div className="ab-runner-ground-line" />

          {obstacles.map(obs => (
            <div key={obs.id} className={`ab-incoming-obstacle ab-incoming-obstacle--${obs.type}`}>
              {obs.type === 'beetle' && (
                <svg viewBox="0 0 14 10" width="28" height="20" shapeRendering="crispEdges">
                  <rect x="3" y="0" width="8" height="2" fill="#78350f" />
                  <rect x="1" y="2" width="12" height="4" fill="#b45309" />
                  <rect x="0" y="4" width="14" height="4" fill="#d97706" />
                  <rect x="2" y="5" width="2" height="2" fill="#ffffff" />
                  <rect x="3" y="5" width="1" height="1" fill="#000000" />
                  <rect x="2" y="8" width="3" height="2" fill="#78350f" />
                  <rect x="9" y="8" width="3" height="2" fill="#78350f" />
                </svg>
              )}

              {obs.type === 'pipe' && (
                <svg viewBox="0 0 18 18" width="32" height="32" shapeRendering="crispEdges">
                  <rect x="0" y="0" width="18" height="6" fill="#15803d" />
                  <rect x="1" y="1" width="16" height="4" fill="#22c55e" />
                  <rect x="2" y="1" width="2" height="4" fill="#86efac" />
                  <rect x="14" y="1" width="2" height="4" fill="#14532d" />
                  <rect x="2" y="6" width="14" height="12" fill="#15803d" />
                  <rect x="3" y="6" width="12" height="12" fill="#22c55e" />
                  <rect x="4" y="6" width="2" height="12" fill="#86efac" />
                  <rect x="12" y="6" width="2" height="12" fill="#14532d" />
                </svg>
              )}

              {obs.type === 'spikes' && (
                <svg viewBox="0 0 32 16" width="36" height="18" shapeRendering="crispEdges">
                  <rect x="0" y="14" width="32" height="2" fill="#334155" />
                  <rect x="1" y="13" width="30" height="1" fill="#475569" />
                  <rect x="4" y="0" width="2" height="3" fill="#ef4444" />
                  <rect x="3" y="3" width="4" height="4" fill="#f87171" />
                  <rect x="2" y="7" width="6" height="4" fill="#cbd5e1" />
                  <rect x="1" y="11" width="8" height="3" fill="#64748b" />
                  <rect x="15" y="0" width="2" height="3" fill="#ef4444" />
                  <rect x="14" y="3" width="4" height="4" fill="#f87171" />
                  <rect x="13" y="7" width="6" height="4" fill="#cbd5e1" />
                  <rect x="12" y="11" width="8" height="3" fill="#64748b" />
                  <rect x="26" y="0" width="2" height="3" fill="#ef4444" />
                  <rect x="25" y="3" width="4" height="4" fill="#f87171" />
                  <rect x="24" y="7" width="6" height="4" fill="#cbd5e1" />
                  <rect x="23" y="11" width="8" height="3" fill="#64748b" />
                </svg>
              )}

              {obs.type === 'pit' && (
                <svg viewBox="0 0 44 24" width="48" height="26" shapeRendering="crispEdges">
                  <rect x="4" y="2" width="36" height="22" fill="#020617" />
                  <rect x="6" y="4" width="32" height="20" fill="#000000" />
                  <rect x="0" y="0" width="4" height="3" fill="var(--color-accent, #3b82f6)" />
                  <rect x="0" y="3" width="3" height="4" fill="#1e40af" />
                  <rect x="0" y="7" width="2" height="8" fill="#0f172a" />
                  <rect x="40" y="0" width="4" height="3" fill="var(--color-accent, #3b82f6)" />
                  <rect x="41" y="3" width="3" height="4" fill="#1e40af" />
                  <rect x="42" y="7" width="2" height="8" fill="#0f172a" />
                  <rect x="8" y="18" width="2" height="4" fill="#dc2626" />
                  <rect x="14" y="16" width="2" height="6" fill="#ef4444" />
                  <rect x="20" y="17" width="2" height="5" fill="#f97316" />
                  <rect x="26" y="16" width="2" height="6" fill="#ef4444" />
                  <rect x="32" y="18" width="2" height="4" fill="#dc2626" />
                  <rect x="10" y="22" width="24" height="2" fill="#b91c1c" />
                </svg>
              )}
            </div>
          ))}

          <div className={`ab-stationed-hero ${jumpVariant ? `ab-stationed-hero--jumping-${jumpVariant}` : ''}`}>
            <div className="ab-sh-sprite">
              <svg viewBox="0 0 24 30" width="48" height="60" shapeRendering="crispEdges">
                <rect x="8" y="0" width="7" height="2" fill="#ffffff" />
                <rect x="6" y="1" width="10" height="2" fill="#ffffff" />
                <rect x="5" y="2" width="12" height="3" fill="#ffffff" />
                <rect x="17" y="3" width="2" height="2" fill="#ffffff" />
                <rect x="4" y="3" width="3" height="4" fill="#ffffff" />
                <rect x="4" y="4" width="1" height="3" fill="#e2e8f0" />
                <rect x="5" y="6" width="2" height="2" fill="#e2e8f0" />
                <rect x="7" y="2" width="4" height="1" fill="#e2e8f0" />
                <rect x="12" y="2" width="3" height="1" fill="#e2e8f0" />
                <rect x="15" y="4" width="2" height="2" fill="#ffffff" />
                <rect x="16" y="5" width="2" height="2" fill="#ffffff" />
                <rect x="7" y="5" width="9" height="5" fill="#fed7aa" />
                <rect x="9" y="10" width="5" height="2" fill="#fed7aa" />
                <rect x="6" y="6" width="1" height="2" fill="#fbcfe8" />
                <rect x="12" y="5" width="3" height="1" fill="#94a3b8" />
                <rect x="12" y="6" width="3" height="2" fill="#ffffff" />
                <rect x="13" y="6" width="2" height="2" fill="#78350f" />
                <rect x="13" y="6" width="1" height="1" fill="#ffffff" />
                <rect x="16" y="8" width="1" height="1" fill="#fca5a5" />
                <rect x="14" y="9" width="2" height="1" fill="#f43f5e" />
                <rect x="8" y="11" width="7" height="1" fill="#d6d3d1" />
                <rect x="9" y="11" width="5" height="1" fill="#f5f5f4" />
                <rect x="6" y="12" width="11" height="6" fill="#f5f5f4" />
                <rect x="5" y="12" width="2" height="6" fill="#e7e5e4" />
                <rect x="9" y="14" width="6" height="3" fill="#e7e5e4" />
                <rect x="10" y="15" width="4" height="2" fill="#f5f5f4" />
                <rect x="9" y="14" width="1" height="2" fill="#d6d3d1" />
                <rect x="14" y="14" width="1" height="2" fill="#d6d3d1" />
                <rect x="6" y="18" width="11" height="1" fill="#d6d3d1" />
                <rect x="4" y="13" width="2" height="3" fill="#d6d3d1" />
                <rect x="3" y="15" width="2" height="2" fill="#fed7aa" />
                <rect x="15" y="13" width="2" height="3" fill="#f5f5f4" />
                <rect x="16" y="15" width="2" height="2" fill="#fed7aa" />
                <rect x="6" y="19" width="11" height="1" fill="#1e40af" />
                <rect x="6" y="20" width="11" height="2" fill="#2563eb" />
                <rect x="5" y="20" width="2" height="2" fill="#1d4ed8" />
                <rect x="4" y="22" width="4" height="2" fill="#1d4ed8" />
                <rect x="3" y="24" width="4" height="2" fill="#2563eb" />
                <rect x="3" y="26" width="3" height="1" fill="#1d4ed8" />
                <rect x="11" y="22" width="4" height="2" fill="#2563eb" />
                <rect x="12" y="22" width="2" height="2" fill="#3b82f6" />
                <rect x="13" y="24" width="4" height="2" fill="#2563eb" />
                <rect x="14" y="26" width="3" height="1" fill="#1d4ed8" />
                <rect x="2" y="27" width="5" height="2" fill="#ffffff" />
                <rect x="1" y="28" width="6" height="1" fill="#0f172a" />
                <rect x="13" y="27" width="5" height="2" fill="#ffffff" />
                <rect x="15" y="27" width="2" height="1" fill="#2563eb" />
                <rect x="13" y="28" width="6" height="1" fill="#0f172a" />
              </svg>
              <div className={`ab-sh-dust ${jumpVariant ? 'ab-sh-dust--hidden' : ''}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
