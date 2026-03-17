import type { DailyStats } from '../../types'
import { computeAverageWear } from '../../utils/stats'
import { formatDuration } from '../../utils/time'

interface Props { stats: DailyStats[] }

export default function StatsGrid({ stats }: Props) {
  const avgWear = computeAverageWear(stats)
  const totalRemovals = stats.reduce((s, d) => s + d.removals, 0)
  const avgRemovals = stats.length > 0 ? totalRemovals / stats.length : 0
  const longestRemoval = stats.length > 0
    ? Math.max(...stats.map(d => d.longestRemovalMinutes))
    : 0
  const complianceDays = stats.filter(d => d.compliant).length

  const items = [
    { label: 'Avg Wear', value: `${avgWear.toFixed(1)}%` },
    { label: 'Total Removals', value: String(totalRemovals) },
    { label: 'Avg/Day', value: String(Math.round(avgRemovals)) },
    { label: 'Longest Off', value: formatDuration(longestRemoval) },
    { label: 'Compliant Days', value: `${complianceDays}/${stats.length}` },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl p-3 shadow-sm text-center">
          <div className="text-lg font-bold text-gray-800">{item.value}</div>
          <div className="text-xs text-gray-400 mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
