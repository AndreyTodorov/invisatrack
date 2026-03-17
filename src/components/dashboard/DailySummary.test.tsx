import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DailySummary from './DailySummary'

// 22h wear goal → 2h = 120min allowed off time
const GOAL_MINUTES = 22 * 60

describe('DailySummary', () => {
  it('shows correct Budget Left with no sessions and no active timer', () => {
    render(
      <DailySummary
        totalOffMinutes={0}
        removals={0}
        goalMinutes={GOAL_MINUTES}
        streak={0}
      />
    )
    // maxOff = 1440 - 1320 = 120 → 02:00:00
    expect(screen.getByText('02:00:00')).toBeInTheDocument()
  })

  it('subtracts completed off-time from Budget Left', () => {
    render(
      <DailySummary
        totalOffMinutes={40}
        removals={1}
        goalMinutes={GOAL_MINUTES}
        streak={0}
      />
    )
    // 120 - 40 = 80 → 01:20:00
    expect(screen.getByText('01:20:00')).toBeInTheDocument()
  })

  // Regression: active timer elapsed time was not counted against budget,
  // so Budget Left didn't countdown while aligners were out.
  it('subtracts activeMinutes from Budget Left while timer is running', () => {
    render(
      <DailySummary
        totalOffMinutes={60}
        removals={1}
        goalMinutes={GOAL_MINUTES}
        streak={0}
        activeMinutes={30}
      />
    )
    // 120 - 60 - 30 = 30 → 00:30:00
    expect(screen.getByText('00:30:00')).toBeInTheDocument()
  })

  it('includes activeMinutes in the Off Time display', () => {
    render(
      <DailySummary
        totalOffMinutes={60}
        removals={1}
        goalMinutes={GOAL_MINUTES}
        streak={0}
        activeMinutes={30}
      />
    )
    // 60 + 30 = 90 → 01:30:00
    expect(screen.getByText('01:30:00')).toBeInTheDocument()
  })

  it('shows 00:00:00 for Budget Left when budget is exhausted, not a negative value', () => {
    render(
      <DailySummary
        totalOffMinutes={100}
        removals={3}
        goalMinutes={GOAL_MINUTES}
        streak={0}
        activeMinutes={40}
      />
    )
    // 120 - 100 - 40 = -20 → clamped to 0 → 00:00:00
    const budgetLabel = screen.getByText('Budget Left')
    expect(budgetLabel.previousElementSibling?.textContent).toBe('00:00:00')
  })

  it('defaults activeMinutes to 0 when prop is omitted', () => {
    render(
      <DailySummary
        totalOffMinutes={90}
        removals={2}
        goalMinutes={GOAL_MINUTES}
        streak={0}
      />
    )
    // 120 - 90 = 30 → 00:30:00
    expect(screen.getByText('00:30:00')).toBeInTheDocument()
  })
})
