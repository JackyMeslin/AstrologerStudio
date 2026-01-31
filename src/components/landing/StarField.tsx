'use client'

import { useEffect, useRef, useState } from 'react'

export function StarField() {
  const [stars, setStars] = useState<
    Array<{ id: number; x: number; y: number; size: 'sm' | 'md' | 'lg'; delay: number }>
  >([])

  const [shootingStars, setShootingStars] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  // Track all active timeouts for cleanup
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  useEffect(() => {
    // Generate static stars
    const generateStars = () => {
      const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg']
      const newStars: Array<{
        id: number
        x: number
        y: number
        size: 'sm' | 'md' | 'lg'
        delay: number
      }> = []
      for (let i = 0; i < 60; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: sizes[Math.floor(Math.random() * 3)]!,
          delay: Math.random() * 5,
        })
      }
      setStars(newStars)
    }
    generateStars()

    // Generate shooting star schedule
    const scheduleNextBatch = (initialDelay?: number) => {
      // "Not too often": 10 to 20 seconds, unless initialDelay is provided
      const timeout = initialDelay !== undefined ? initialDelay : Math.random() * 10000 + 10000

      const mainTimeoutId = setTimeout(() => {
        // "2/3 simultaneous stars": 2 to 3 stars
        const count = Math.floor(Math.random() * 2) + 2
        const now = Date.now()
        const newStars: Array<{ id: number; x: number; y: number; delay: number }> = []

        for (let i = 0; i < count; i++) {
          newStars.push({
            id: now * 1000 + Math.floor(Math.random() * 1000) + i,
            x: Math.random() * 50 + 50,
            y: Math.random() * 50,
            // "Slight delay": Tighter stagger (0 to 0.8s)
            delay: Math.random() * 0.8,
          })
        }

        setShootingStars((prev) => [...prev, ...newStars])

        // Remove star after animation
        const cleanupTimeoutId = setTimeout(() => {
          timeoutsRef.current.delete(cleanupTimeoutId)
          setShootingStars((prev) => prev.filter((s) => s.id < now))
        }, 5000)
        timeoutsRef.current.add(cleanupTimeoutId)

        // Schedule next (always random interval after first one)
        timeoutsRef.current.delete(mainTimeoutId)
        scheduleNextBatch()
      }, timeout)
      timeoutsRef.current.add(mainTimeoutId)
    }

    // Start loop immediately (small delay to let animation frames settle)
    scheduleNextBatch(500)

    // Cleanup: cancel all pending timeouts on unmount
    // Copy ref to local variable per React exhaustive-deps rule
    const timeouts = timeoutsRef.current
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId))
      timeouts.clear()
    }
  }, [])

  return (
    <div className="star-field">
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star star-${star.size}`}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {shootingStars.map((star) => (
        <div
          key={star.id}
          className="shooting-star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            animation: 'shooting-star-run 2.5s linear forwards',
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* Light Mode Elements: Sun & Clouds - Removed per request */}
      {/* <div className="sun-container">
        <div className="sun-rays" />
        <div className="sun-core" />
      </div>

      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" /> */}
    </div>
  )
}
