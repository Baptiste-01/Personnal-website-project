import confetti from 'canvas-confetti'

/**
 * Triggers a massive celebratory confetti show for game wins or podium reveals.
 */
export function triggerVictoryConfetti(): void {
  const duration = 2.5 * 1000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now()
    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    const particleCount = 50 * (timeLeft / duration)
    // Cannon from left
    confetti({
      ...defaults,
      particleCount,
      origin: { x: 0.1, y: 0.7 },
      colors: ['#3b82f6', '#ec4899', '#22c55e', '#eab308', '#06b6d4'],
    })
    // Cannon from right
    confetti({
      ...defaults,
      particleCount,
      origin: { x: 0.9, y: 0.7 },
      colors: ['#3b82f6', '#ec4899', '#22c55e', '#eab308', '#06b6d4'],
    })
  }, 250)
}

/**
 * Triggers a quick spark burst when a player achieves a high answer streak.
 */
export function triggerStreakConfetti(): void {
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#f59e0b', '#ef4444', '#ec4899'],
    zIndex: 9999,
  })
}

