import { useRef } from 'react'
import type { TouchEvent } from 'react'

const THRESHOLD_PX = 50 // minimum horizontal distance to register as swipe

/**
 * Returns touch handlers to attach to a container.
 * Calls onSwipe('left') when user swipes left (→ next tab),
 * onSwipe('right') when user swipes right (→ prev tab).
 * Ignores gestures that are more vertical than horizontal.
 */
export function useSwipeTab(onSwipe: (dir: 'left' | 'right') => void) {
  const start = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (!start.current) return
    const dx = e.changedTouches[0].clientX - start.current.x
    const dy = e.changedTouches[0].clientY - start.current.y
    start.current = null

    if (Math.abs(dx) < THRESHOLD_PX) return       // too short
    if (Math.abs(dy) > Math.abs(dx)) return        // more vertical than horizontal

    onSwipe(dx < 0 ? 'left' : 'right')
  }

  return { onTouchStart, onTouchEnd }
}
