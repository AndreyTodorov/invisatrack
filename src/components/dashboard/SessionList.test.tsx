import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SessionList from './SessionList'
import type { Session } from '../../types'

const makeSession = (
  id: string,
  startTime: string,
  endTime: string | null | undefined,
): Session => ({
  id,
  startTime,
  endTime: endTime as string | null,
  startTimezoneOffset: 0,
  endTimezoneOffset: endTime ? 0 : null,
  setNumber: 1,
  autoCapped: false,
  createdOffline: false,
  deviceId: 'dev1',
  updatedAt: startTime,
})

describe('SessionList', () => {
  it('shows completed sessions', () => {
    const sessions = [
      makeSession('s1', '2026-03-17T10:00:00.000Z', '2026-03-17T10:30:00.000Z'),
    ]
    render(<SessionList sessions={sessions} onEdit={vi.fn()} />)
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
    expect(screen.getByText(/10:30/)).toBeInTheDocument()
  })

  it('shows empty state when no sessions', () => {
    render(<SessionList sessions={[]} onEdit={vi.fn()} />)
    expect(screen.getByText(/No sessions yet today/)).toBeInTheDocument()
  })

  it('does not show active session with endTime: null', () => {
    const sessions = [
      makeSession('active', '2026-03-17T13:14:00.000Z', null),
    ]
    render(<SessionList sessions={sessions} onEdit={vi.fn()} />)
    expect(screen.getByText(/No sessions yet today/)).toBeInTheDocument()
  })

  // Regression test: Firebase RTDB omits null fields on read, so endTime comes
  // back as undefined instead of null. The old filter (endTime !== null) passed
  // undefined through, causing NaN:NaN in the rendered time display.
  it('does not show active session with endTime: undefined (Firebase null omission)', () => {
    const sessions = [
      makeSession('active', '2026-03-17T13:14:00.000Z', undefined),
    ]
    render(<SessionList sessions={sessions} onEdit={vi.fn()} />)
    expect(screen.getByText(/No sessions yet today/)).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('shows only completed sessions when mixed with an active one', () => {
    const sessions = [
      makeSession('done', '2026-03-17T08:00:00.000Z', '2026-03-17T08:45:00.000Z'),
      makeSession('active', '2026-03-17T13:14:00.000Z', undefined),
    ]
    render(<SessionList sessions={sessions} onEdit={vi.fn()} />)
    expect(screen.getByText(/08:00/)).toBeInTheDocument()
    expect(screen.queryByText(/13:14/)).not.toBeInTheDocument()
  })
})
