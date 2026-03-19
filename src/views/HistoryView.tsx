import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useDataContext } from '../contexts/DataContext'
import { useReports } from '../hooks/useReports'
import SessionList from '../components/dashboard/SessionList'
import SessionEditModal from '../components/sessions/SessionEditModal'
import AddSessionModal from '../components/sessions/AddSessionModal'
import SetEditModal from '../components/sets/SetEditModal'
import StartNewSetModal from '../components/sets/StartNewSetModal'
import { toLocalDate, formatDateKey, formatDuration, formatDurationShort, diffMinutes, dateDiffDays, todayLocalDate } from '../utils/time'
import { DEFAULT_DAILY_WEAR_GOAL_MINUTES } from '../constants'
import type { Session, AlignerSet } from '../types'

type Tab = 'sessions' | 'sets'
type Filter = 'all' | 'this-set' | 'missed' | 'this-month'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'this-set', label: 'This set' },
  { key: 'missed', label: 'Missed days' },
  { key: 'this-month', label: 'This month' },
]

export default function HistoryView() {
  const { sessions } = useSessions()
  const { loaded, profile, sets, treatment } = useDataContext()
  const goalMinutes = profile?.dailyWearGoalMinutes ?? DEFAULT_DAILY_WEAR_GOAL_MINUTES
  const goalPct = (goalMinutes / 1440) * 100
  const { getDailyStatsRange, getSetStats } = useReports(goalMinutes)
  const [tab, setTab] = useState<Tab>('sessions')
  const [filter, setFilter] = useState<Filter>('all')
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
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
  const today = todayLocalDate()
  const currentMonth = today.slice(0, 7)
  const currentSetStart = treatment?.currentSetStartDate.slice(0, 10) ?? today

  // Precompute stats for all session dates at once
  const allDateStatsArr = getDailyStatsRange(sortedDates)
  const allDateStatsMap = new Map(sortedDates.map((d, i) => [d, allDateStatsArr[i]]))

  // Apply filter
  const filteredDates = sortedDates.filter(date => {
    switch (filter) {
      case 'this-set': return date >= currentSetStart
      case 'missed': return !(allDateStatsMap.get(date)?.compliant ?? true)
      case 'this-month': return date.startsWith(currentMonth)
      default: return true
    }
  })

  // Group by month (B)
  const monthGroups = filteredDates.reduce<Record<string, string[]>>((acc, date) => {
    const month = date.slice(0, 7)
    acc[month] = [...(acc[month] ?? []), date]
    return acc
  }, {})
  const sortedMonths = Object.keys(monthGroups).sort().reverse()

  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

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
          {/* (D) Filter chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  fontSize: 12, fontWeight: filter === key ? 600 : 400,
                  padding: '5px 12px', borderRadius: 20,
                  background: filter === key ? 'rgba(34,211,238,0.12)' : 'var(--surface)',
                  border: `1px solid ${filter === key ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                  color: filter === key ? 'var(--cyan)' : 'var(--text-muted)',
                  fontFamily: 'inherit', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

{filteredDates.length === 0 && (
            <p style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
              {filter === 'all' ? 'No sessions yet' : 'No sessions match this filter'}
            </p>
          )}

          {/* (B) Month groups */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortedMonths.map(monthKey => {
              const dates = monthGroups[monthKey]
              const isCollapsed = collapsedMonths.has(monthKey)
              const monthStatsList = dates.map(d => allDateStatsMap.get(d)!)
              const compliantDays = monthStatsList.filter(s => s?.compliant).length
              const totalSessions = dates.reduce((sum, d) => sum + byDate[d].length, 0)
              const compliancePct = dates.length > 0 ? Math.round((compliantDays / dates.length) * 100) : 0
              const monthLabel = new Date(monthKey + '-15').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

              const pctColor = compliancePct >= 80 ? 'var(--green)' : compliancePct >= 60 ? 'var(--amber)' : 'var(--rose)'
              const pctBg = compliancePct >= 80 ? 'rgba(74,222,128,0.1)' : compliancePct >= 60 ? 'var(--amber-bg)' : 'var(--rose-bg)'
              const pctBorder = compliancePct >= 80 ? 'rgba(74,222,128,0.2)' : compliancePct >= 60 ? 'rgba(252,211,77,0.2)' : 'rgba(248,113,113,0.2)'

              return (
                <div key={monthKey} style={{ marginBottom: 24 }}>
                  {/* (B) Month header — collapsible */}
                  <button
                    onClick={() => toggleMonth(monthKey)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      width: '100%', background: 'none', border: 'none',
                      padding: '4px 0 10px', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{monthLabel}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {totalSessions} sessions · {compliantDays}/{dates.length} days
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                        color: pctColor, background: pctBg, border: `1px solid ${pctBorder}`,
                      }}>
                        {compliancePct}%
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{isCollapsed ? '▼' : '▲'}</span>
                    </div>
                  </button>

                  {/* Date groups within month */}
                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {dates.map(date => {
                        const dayStat = allDateStatsMap.get(date)!
                        return (
                          <div key={date}>
                            {/* (E) Sticky date header */}
                            <div style={{
                              position: 'sticky', top: 0, zIndex: 5,
                              background: 'var(--bg)',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              paddingTop: 4, paddingBottom: 8, marginTop: -4,
                            }}>
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
                                  {formatDuration(Math.round(1440 - dayStat.totalOffMinutes))}
                                </span>
                              </div>
                            </div>
                            <SessionList sessions={byDate[date]} onEdit={setEditingSession} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
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
                && s.startDate.slice(0, 10) <= todayLocalDate()
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
                          color: stats.avgWearPct >= goalPct ? 'var(--green)' : stats.avgWearPct >= 75 ? 'var(--amber)' : 'var(--rose)',
                          background: stats.avgWearPct >= goalPct ? 'rgba(74,222,128,0.1)' : stats.avgWearPct >= 75 ? 'var(--amber-bg)' : 'var(--rose-bg)',
                          border: `1px solid ${stats.avgWearPct >= goalPct ? 'rgba(74,222,128,0.2)' : stats.avgWearPct >= 75 ? 'rgba(252,211,77,0.2)' : 'rgba(248,113,113,0.2)'}`,
                          borderRadius: 6, padding: '2px 7px',
                        }}>
                          {stats.avgWearPct >= goalPct ? 'On track' : stats.avgWearPct >= 75 ? 'Near goal' : 'Below goal'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    {dateRange}{duration !== null ? ` · ${duration}d` : ''}
                  </div>

                  {stats.totalRemovals > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {stats.totalRemovals} sessions · {stats.avgRemovalsPerDay.toFixed(1)}/day · {stats.complianceDays} compliant {stats.complianceDays === 1 ? 'day' : 'days'}
                      </div>

                      {/* (C) Wear progress bar */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Avg daily wear</span>
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: stats.avgWearPct >= goalPct ? 'var(--green)' : stats.avgWearPct >= goalPct * 0.85 ? 'var(--amber)' : 'var(--rose)',
                          }}>
                            {formatDuration(Math.round(1440 - stats.avgOffMinutes))}
                          </span>
                        </div>
                        <div style={{ width: '100%', height: 4, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (stats.avgWearPct / goalPct) * 100)}%`,
                            background: stats.avgWearPct >= goalPct
                              ? 'linear-gradient(90deg, var(--cyan), var(--green))'
                              : stats.avgWearPct >= goalPct * 0.85
                              ? 'var(--amber)'
                              : 'var(--rose)',
                            borderRadius: 3,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                          <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>Goal: {formatDurationShort(goalMinutes)}</span>
                        </div>
                      </div>
                    </>
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
          isCurrent={editingSet.setNumber === treatment?.currentSetNumber
            && editingSet.startDate.slice(0, 10) <= todayLocalDate()}
          prevSet={sets
            .filter(s => s.id !== editingSet.id && s.startDate.slice(0, 10) < editingSet.startDate.slice(0, 10))
            .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null}
          nextSet={sets
            .filter(s => s.id !== editingSet.id && s.startDate.slice(0, 10) > editingSet.startDate.slice(0, 10))
            .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null}
          goalMinutes={goalMinutes}
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
