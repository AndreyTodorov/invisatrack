import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts'
import type { DailyStats } from '../../types'
import { MINUTES_PER_DAY } from '../../constants'
import { formatDuration } from '../../utils/time'

interface Props {
  data: DailyStats[]
  goalMinutes: number
}

export default function WearChart({ data, goalMinutes }: Props) {
  const chartData = data.map(d => ({
    date: d.date.slice(8, 10) + '.' + d.date.slice(5, 7), // DD.MM
    wear: Math.round(d.wearPercentage),
    compliant: d.compliant,
    offMinutes: d.totalOffMinutes,
  }))

  const goalPercent = Math.round((goalMinutes / MINUTES_PER_DAY) * 100)

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; payload: { offMinutes: number } }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
        borderRadius: 10, padding: '8px 12px',
        fontSize: 13,
      }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ color: 'var(--cyan)', fontWeight: 600 }}>{payload[0].value}% wear</div>
        {payload[0].payload.offMinutes > 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
            {formatDuration(payload[0].payload.offMinutes)} off
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 20, padding: '16px 8px 12px',
    }}>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={chartData} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6272A0', fontFamily: 'Outfit, sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#6272A0', fontFamily: 'Outfit, sans-serif' }}
            unit="%"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }} />
          <ReferenceLine
            y={goalPercent}
            stroke="rgba(248,113,113,0.5)"
            strokeDasharray="4 3"
            label={{ value: 'Goal', fill: 'rgba(248,113,113,0.7)', fontSize: 10, fontFamily: 'Outfit' }}
          />
          <Bar dataKey="wear" radius={[5, 5, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.compliant ? 'rgba(34,211,238,0.7)' : 'rgba(248,113,113,0.7)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
