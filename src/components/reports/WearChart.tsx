import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import type { DailyStats } from '../../types'
import { MINUTES_PER_DAY } from '../../constants'

interface Props {
  data: DailyStats[]
  goalMinutes: number   // FIX LG-2: dynamic, not hardcoded
}

export default function WearChart({ data, goalMinutes }: Props) {
  const chartData = data.map(d => ({
    date: d.date.slice(8, 10) + '.' + d.date.slice(5, 7), // DD.MM
    wear: Math.round(d.wearPercentage),
  }))

  // FIX LG-2: compute from actual goal setting
  const goalPercent = Math.round((goalMinutes / MINUTES_PER_DAY) * 100)

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => [`${v}%`, 'Wear']} />
        <ReferenceLine
          y={goalPercent}
          stroke="#ef4444"
          strokeDasharray="4 2"
          label={{ value: 'Goal', fill: '#ef4444', fontSize: 11 }}
        />
        <Bar dataKey="wear" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
