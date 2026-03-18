import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeView from './HomeView'

// ─── Mock all hooks and contexts ────────────────────────────────────────────

vi.mock('../contexts/DataContext', () => ({ useDataContext: vi.fn() }))
vi.mock('../hooks/useTimer', () => ({ useTimer: vi.fn() }))
vi.mock('../hooks/useSessions', () => ({ useSessions: vi.fn() }))
vi.mock('../hooks/useReports', () => ({ useReports: vi.fn() }))
vi.mock('../hooks/useAutoAdvanceSet', () => ({ useAutoAdvanceSet: vi.fn() }))

// Mock react-router-dom navigate while keeping MemoryRouter
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) }
})

// Mock child components — not under test here
vi.mock('../components/timer/ActiveTimer', () => ({ default: () => null }))
vi.mock('../components/timer/TimerButton', () => ({ default: () => null }))
vi.mock('../components/timer/TimerAlert', () => ({ default: () => null }))
vi.mock('../components/dashboard/DailySummary', () => ({ default: () => null }))
vi.mock('../components/dashboard/SessionList', () => ({ default: () => null }))
vi.mock('../components/dashboard/TreatmentProgress', () => ({ default: () => null }))
vi.mock('../components/sessions/SessionEditModal', () => ({ default: () => null }))
vi.mock('../components/sessions/AddSessionModal', () => ({ default: () => null }))

import { useDataContext } from '../contexts/DataContext'
import { useTimer } from '../hooks/useTimer'
import { useSessions } from '../hooks/useSessions'
import { useReports } from '../hooks/useReports'
import { useAutoAdvanceSet } from '../hooks/useAutoAdvanceSet'

// ─── Default hook stubs ──────────────────────────────────────────────────────

const defaultTimer = {
  elapsedMinutes: 0, isRunning: false, reminderFired: false, autoCapped: false,
  start: vi.fn(), stop: vi.fn(), activeSessionId: null,
}

const defaultSessions = { sessions: [], startSession: vi.fn(), stopSession: vi.fn() }

const defaultReports = {
  streak: 0,
  allSegments: [],
  getSetStats: vi.fn(() => null),
  getDailyStatsRange: vi.fn(() => []),
  sets: [],
}

const defaultAutoAdvance = { autoAdvancedSets: [], dismiss: vi.fn() }

function setupHooks() {
  vi.mocked(useTimer).mockReturnValue(defaultTimer as unknown as ReturnType<typeof useTimer>)
  vi.mocked(useSessions).mockReturnValue(defaultSessions as unknown as ReturnType<typeof useSessions>)
  vi.mocked(useReports).mockReturnValue(defaultReports as unknown as ReturnType<typeof useReports>)
  vi.mocked(useAutoAdvanceSet).mockReturnValue(defaultAutoAdvance as unknown as ReturnType<typeof useAutoAdvanceSet>)
}

function renderHome() {
  return render(<MemoryRouter><HomeView /></MemoryRouter>)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  setupHooks()
})

describe('HomeView — loading states', () => {
  it('shows "Loading your data…" while IndexedDB has not yet resolved', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: false, firebaseTreatmentLoaded: false, connected: null,
      treatment: null, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(screen.getByText('Loading your data…')).toBeInTheDocument()
  })

  it('shows "Syncing with server…" when IndexedDB is empty and Firebase has not responded', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: false, connected: null,
      treatment: null, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(screen.getByText('Syncing with server…')).toBeInTheDocument()
  })
})

describe('HomeView — onboarding redirect', () => {
  it('does not redirect while waiting for Firebase to confirm treatment', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: false, connected: null,
      treatment: null, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('redirects to /onboarding once Firebase confirms there is no treatment', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: true, connected: true,
      treatment: null, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true })
  })

  it('does not redirect when treatment exists', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: true, connected: true,
      treatment: { currentSetNumber: 1, totalSets: 10, defaultSetDurationDays: 7, currentSetStartDate: '2026-01-01' },
      profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

describe('HomeView — sync indicator', () => {
  const treatment = { currentSetNumber: 1, totalSets: 10, defaultSetDurationDays: 7, currentSetStartDate: '2026-01-01' }

  it('shows "Syncing…" pill when loaded but Firebase not yet responded and local treatment exists', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: false, connected: null,
      treatment, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(screen.getByText('Syncing…')).toBeInTheDocument()
  })

  it('shows "Offline" pill when Firebase reports disconnected', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: true, connected: false,
      treatment, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('shows no pill when loaded, synced, and connected', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: true, connected: true,
      treatment, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(screen.queryByText('Syncing…')).not.toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('shows "Syncing…" (not "Offline") when both syncing and disconnected simultaneously', () => {
    vi.mocked(useDataContext).mockReturnValue({
      loaded: true, firebaseTreatmentLoaded: false, connected: false,
      treatment, profile: null, sets: [], sessions: [], setSessions: vi.fn(),
    })

    renderHome()

    expect(screen.getByText('Syncing…')).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })
})
