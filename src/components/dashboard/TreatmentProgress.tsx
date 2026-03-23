import { dateDiffDays, todayLocalDate, addDays } from '../../utils/time'
import type { Treatment } from '../../types'

interface Props {
  treatment: Treatment | null
  defaultSetDurationDays: number
  currentSetStartDate?: string | null
  currentSetEndDate?: string | null
  currentSetDayStatus?: Map<string, boolean>
  avgWearPct?: number  // avg wear % for the current set
  goalMinutes?: number
}

function estimatedCompletion(treatment: Treatment, defaultDuration: number): string {
  if (!treatment.totalSets) return 'Unknown'
  const setsRemaining = treatment.totalSets - treatment.currentSetNumber
  const daysRemaining = setsRemaining * defaultDuration
  const completion = new Date()
  completion.setDate(completion.getDate() + daysRemaining)
  return completion.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function TreatmentProgress({ treatment, defaultSetDurationDays, currentSetStartDate: currentSetStartDateProp, currentSetEndDate, currentSetDayStatus, avgWearPct, goalMinutes }: Props) {
  if (!treatment) return null

  const { currentSetNumber, totalSets } = treatment
  const currentSetStartDate = (currentSetStartDateProp || treatment.currentSetStartDate).slice(0, 10)
  const daysSinceStart = dateDiffDays(currentSetStartDate, todayLocalDate())
  const daysLeft = currentSetEndDate
    ? dateDiffDays(todayLocalDate(), currentSetEndDate.slice(0, 10))
    : defaultSetDurationDays - daysSinceStart
  const setProgress = Math.min(1, daysSinceStart / defaultSetDurationDays)
  const overallProgress = totalSets
    ? (currentSetNumber - 1 + setProgress) / totalSets
    : null


  return (
    <div style={{
      background: 'var(--surface)',
      border: 'var(--border-width) solid var(--border)',
      borderRadius: 'var(--radius-card)',
      boxShadow: 'var(--card-shadow)',
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Aligner Set
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginLeft: 10 }}>
            {currentSetNumber}
            {totalSets ? <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}> / {totalSets}</span> : ''}
          </span>
        </div>
        {totalSets && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            ~{estimatedCompletion(treatment, defaultSetDurationDays)}
          </span>
        )}
      </div>

      {overallProgress !== null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            width: '100%',
            height: 5,
            background: 'var(--surface-3)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${overallProgress * 100}%`,
              background: 'linear-gradient(90deg, var(--cyan), var(--green))',
              borderRadius: 3,
              transition: 'width 0.6s ease',
              boxShadow: '0 0 8px var(--cyan-glow)',
            }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {Array.from({ length: defaultSetDurationDays }, (_, i) => {
            const squareDate = addDays(currentSetStartDate, i)
            const today = todayLocalDate()
            const isFuture = squareDate > today
            const status = currentSetDayStatus?.get(squareDate)
            const hasData = status !== undefined
            return (
              <div
                key={i}
                style={{
                  width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                  background: isFuture
                    ? 'var(--surface-3)'
                    : hasData
                    ? status ? 'var(--green)' : 'var(--rose)'
                    : 'var(--surface-3)',
                  boxShadow: hasData && status
                    ? '0 0 4px rgba(0,230,118,0.4)'
                    : hasData && !status
                    ? '0 0 4px rgba(255,68,68,0.4)'
                    : 'none',
                  opacity: isFuture ? 0.35 : 1,
                }}
              />
            )
          })}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {Math.max(0, daysLeft)} days left
        </span>
      </div>

      {avgWearPct !== undefined && goalMinutes !== undefined && (() => {
        const goalPct = (goalMinutes / 1440) * 100
        const diff = Math.abs(Math.round(avgWearPct - goalPct))
        const onTrack = avgWearPct >= goalPct || diff === 0
        return (
          <div style={{
            marginTop: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px',
            background: onTrack ? 'rgba(0,230,118,0.07)' : 'var(--amber-bg)',
            border: `var(--border-width) solid ${onTrack ? 'rgba(0,230,118,0.15)' : 'rgba(255,194,0,0.2)'}`,
            borderRadius: 'var(--radius-card)',
          }}>
            <span style={{ fontSize: 13 }}>{onTrack ? '✓' : '⚠'}</span>
            <span style={{ fontSize: 12, color: onTrack ? 'var(--green)' : 'var(--amber)', fontWeight: 500 }}>
              {onTrack
                ? `On track this set`
                : `Below wear goal avg for this set`}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
