import type { Treatment } from '../../types'

interface Props {
  treatment: Treatment | null
  defaultSetDurationDays: number
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

export default function TreatmentProgress({ treatment, defaultSetDurationDays, avgWearPct, goalMinutes }: Props) {
  if (!treatment) return null

  const { currentSetNumber, totalSets, currentSetStartDate } = treatment
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(currentSetStartDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const setProgress = Math.min(1, daysSinceStart / defaultSetDurationDays)
  const overallProgress = totalSets
    ? (currentSetNumber - 1 + setProgress) / totalSets
    : null

  const progressPct = overallProgress ? Math.round(overallProgress * 100) : null

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 20,
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
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          Day {daysSinceStart + 1} of {defaultSetDurationDays}
        </span>
        {progressPct !== null && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {progressPct}% complete
          </span>
        )}
      </div>

      {avgWearPct !== undefined && goalMinutes !== undefined && (() => {
        const goalPct = (goalMinutes / 1440) * 100
        const onTrack = avgWearPct >= goalPct
        const diff = Math.abs(Math.round(avgWearPct - goalPct))
        return (
          <div style={{
            marginTop: 10,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px',
            background: onTrack ? 'rgba(74,222,128,0.07)' : 'var(--amber-bg)',
            border: `1px solid ${onTrack ? 'rgba(74,222,128,0.15)' : 'rgba(252,211,77,0.2)'}`,
            borderRadius: 10,
          }}>
            <span style={{ fontSize: 13 }}>{onTrack ? '✓' : '⚠'}</span>
            <span style={{ fontSize: 12, color: onTrack ? 'var(--green)' : 'var(--amber)', fontWeight: 500 }}>
              {onTrack
                ? `On track this set (avg ${Math.round(avgWearPct)}% wear)`
                : `${diff}% below goal avg for this set`}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
