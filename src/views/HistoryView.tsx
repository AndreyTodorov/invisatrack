import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useDataContext } from '../contexts/DataContext'
import { useReports } from '../hooks/useReports'
import SessionList from '../components/dashboard/SessionList'
import SessionEditModal from '../components/sessions/SessionEditModal'
import AddSessionModal from '../components/sessions/AddSessionModal'
import SetEditModal from '../components/sets/SetEditModal'
import StartNewSetModal from '../components/sets/StartNewSetModal'
import { toLocalDate, formatDateKey, formatDurationShort, diffMinutes, dateDiffDays } from '../utils/time'
import { DEFAULT_DAILY_WEAR_GOAL_MINUTES } from '../constants'
import type { Session, AlignerSet } from '../types'

type Tab = 'sessions' | 'sets'

export default function HistoryView() {
  const { sessions } = useSessions()
  const { loaded, profile, sets, treatment } = useDataContext()
  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_DAILY_WEAR_GOAL_MINUTES
  const { getDailyStatsRange, getSetStats } = useReports(goalMinutes)
  const [tab, setTab] = useState<Tab>('sessions')
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editingSet, setEditingSet] = useState<AlignerSet | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showStartNewSet, setShowStartNewSet] = useState(false)

  // FIX LG-1: group by LOCAL date using each session's stored timezone offset
  const byDate = sessions
    .filter(s => s.endTime !== null)
    .reduce<Record<string, Session[]>>((acc, s) => {
      const localDate = formatDateKey(toLocalDate(s.startTime, s.startTimezoneOffset))
      acc[localDate] = [...(acc[localDate] ?? []), s]
      return acc
    }, {})

  const sortedDates = Object.keys(byDate).sort().reverse()

  if (!loaded) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-faint)' }}>Loading…</div>
  )

  const sortedSets = [...sets].sort((a, b) => b.setNumber - a.setNumber)

  return (
    <div style={{ padding: '0 16px 16px', maxWidth: 440, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>History</h1>
        {tab === 'sessions' && (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              fontSize: 13, fontWeight: 600, color: 'var(--cyan)',
              background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: 20, padding: '5px 14px', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            + Add
          </button>
        )}
        {tab === 'sets' && treatment && (
          <button
            onClick={() => setShowStartNewSet(true)}
            style={{
              fontSize: 13, fontWeight: 600, color: 'var(--green)',
              background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: 20, padding: '5px 14px', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            + New Set
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 4, marginBottom: 20,
      }}>
        {(['sessions', 'sets'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              background: tab === t ? 'var(--surface-3)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text-muted)',
              border: 'none', borderRadius: 8,
              padding: '8px 0', fontSize: 13, fontWeight: tab === t ? 600 : 400,
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <>
          {sortedDates.length === 0 && (
            <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              No sessions yet
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {sortedDates.map(date => (
              <div key={date}>
                {(() => {
                  const dayStat = getDailyStatsRange([date])[0]
                  const pct = Math.round(dayStat.wearPercentage)
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                          {byDate[date].length} {byDate[date].length === 1 ? 'session' : 'sessions'} · {formatDurationShort(byDate[date].reduce((sum, s) => sum + (s.endTime ? diffMinutes(s.startTime, s.endTime) : 0), 0))}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: dayStat.compliant ? 'var(--green)' : 'var(--rose)',
                          background: dayStat.compliant ? 'rgba(74,222,128,0.1)' : 'var(--rose-bg)',
                          border: `1px solid ${dayStat.compliant ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                          borderRadius: 6, padding: '2px 7px',
                        }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  )
                })()}
                <SessionList sessions={byDate[date]} onEdit={setEditingSession} />
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'sets' && (
        <>
          {sortedSets.length === 0 && (
            <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              No sets yet
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedSets.map(s => {
              const stats = getSetStats(s.setNumber)
              const isCurrent = s.setNumber === treatment?.currentSetNumber
              const duration = s.endDate ? dateDiffDays(s.startDate, s.endDate) : null
              const startStr = s.startDate.slice(0, 10)
              const dateRange = s.endDate
                ? `${startStr} → ${s.endDate.slice(0, 10)}`
                : `${startStr} → ongoing`
              return (
                <button
                  key={s.id}
                  onClick={() => setEditingSet(s)}
                  style={{
                    background: 'var(--surface)', border: `1px solid ${isCurrent ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                    borderRadius: 16, padding: '14px 16px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                      Set {s.setNumber}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isCurrent && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: 'var(--cyan)',
                          background: 'var(--cyan-bg)', border: '1px solid rgba(34,211,238,0.2)',
                          borderRadius: 20, padding: '2px 8px',
                        }}>Current</span>
                      )}
                      {stats.totalRemovals > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: stats.avgWearPct >= 95 ? 'var(--green)' : stats.avgWearPct >= 75 ? 'var(--amber)' : 'var(--rose)',
                          background: stats.avgWearPct >= 95 ? 'rgba(74,222,128,0.1)' : stats.avgWearPct >= 75 ? 'var(--amber-bg)' : 'var(--rose-bg)',
                          border: `1px solid ${stats.avgWearPct >= 95 ? 'rgba(74,222,128,0.2)' : stats.avgWearPct >= 75 ? 'rgba(252,211,77,0.2)' : 'rgba(248,113,113,0.2)'}`,
                          borderRadius: 6, padding: '2px 7px',
                        }}>
                          {Math.round(stats.avgWearPct)}% wear
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {dateRange}{duration !== null ? ` · ${duration}d` : ''}
                  </div>

                  {stats.totalRemovals > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {stats.totalRemovals} sessions · {stats.avgRemovalsPerDay.toFixed(1)}/day · {stats.complianceDays} compliant {stats.complianceDays === 1 ? 'day' : 'days'}
                    </div>
                  )}

                  {s.note && (
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      borderTop: '1px solid var(--border)',
                      paddingTop: 6,
                    }}>
                      {s.note}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {editingSession && (
        <SessionEditModal session={editingSession} onClose={() => setEditingSession(null)} />
      )}
      {editingSet && (
        <SetEditModal
          set={editingSet}
          stats={getSetStats(editingSet.setNumber)}
          isCurrent={editingSet.setNumber === treatment?.currentSetNumber}
          prevSet={sets
            .filter(s => s.id !== editingSet.id && s.startDate.slice(0, 10) < editingSet.startDate.slice(0, 10))
            .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null}
          nextSet={sets
            .filter(s => s.id !== editingSet.id && s.startDate.slice(0, 10) > editingSet.startDate.slice(0, 10))
            .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null}
          onClose={() => setEditingSet(null)}
        />
      )}
      {showAdd && <AddSessionModal onClose={() => setShowAdd(false)} />}
      {showStartNewSet && treatment && (
        <StartNewSetModal
          currentSetNumber={treatment.currentSetNumber}
          defaultDurationDays={treatment.defaultSetDurationDays}
          onClose={() => setShowStartNewSet(false)}
        />
      )}
    </div>
  )
}
