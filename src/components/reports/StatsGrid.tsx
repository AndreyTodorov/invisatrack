import type { DailyStats } from "../../types";
import { formatDuration } from "../../utils/time";

interface Props {
  stats: DailyStats[];
  goalMinutes: number;
}

function goalColor(avgWornMinutes: number, goalMinutes: number): string {
  const ratio = avgWornMinutes / goalMinutes;
  if (ratio >= 1) return "var(--green)";
  if (ratio >= 0.9) return "var(--amber)";
  return "var(--rose)";
}

export default function StatsGrid({ stats, goalMinutes }: Props) {
  const totalOffMinutes = stats.reduce((s, d) => s + d.totalOffMinutes, 0);
  const avgOffMinutes = stats.length > 0 ? totalOffMinutes / stats.length : 0;
  const avgWornMinutes = 1440 - avgOffMinutes;
  const totalRemovals = stats.reduce((s, d) => s + d.removals, 0);
  const avgRemovals = stats.length > 0 ? totalRemovals / stats.length : 0;
  const longestRemoval =
    stats.length > 0 ? Math.max(...stats.map((d) => d.longestRemovalMinutes)) : 0;
  const complianceDays = stats.filter((d) => d.compliant).length;

  const wornFillPct = Math.min((avgWornMinutes / 1440) * 100, 100);
  const goalNotchPct = Math.min((goalMinutes / 1440) * 100, 100);
  const diffMinutes = Math.round(avgWornMinutes - goalMinutes);
  const absDiff = Math.abs(diffMinutes);
  const badgeText =
    diffMinutes >= 0
      ? `${formatDuration(absDiff)} over goal`
      : `${formatDuration(absDiff)} under goal`;
  const badgeColor =
    diffMinutes >= 0
      ? { color: "var(--green)", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)" }
      : { color: "var(--rose)", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" };

  const color = goalColor(avgWornMinutes, goalMinutes);

  const secondaryItems = [
    { label: "Total Removals", value: String(totalRemovals), color: "var(--text)" },
    { label: "Avg Removals / Day", value: String(Math.round(avgRemovals)), color: "var(--text)" },
    { label: "Longest Off", value: formatDuration(longestRemoval), color: "var(--text-muted)" },
    {
      label: "Compliant Days",
      value: `${complianceDays} / ${stats.length}`,
      color:
        complianceDays === stats.length && stats.length > 0
          ? "var(--green)"
          : "var(--text)",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Hero card */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(34,211,238,0.02) 100%)",
          border: "1px solid rgba(34,211,238,0.2)",
          borderRadius: 14,
          padding: "14px 14px 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 5,
              }}
            >
              Avg Worn / Day
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {formatDuration(Math.round(avgWornMinutes))}
            </div>
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: badgeColor.color,
              background: badgeColor.bg,
              border: `1px solid ${badgeColor.border}`,
              borderRadius: 6,
              padding: "3px 7px",
              whiteSpace: "nowrap",
              marginTop: 2,
            }}
          >
            {badgeText}
          </div>
        </div>
        {/* Progress bar: 0–24h, fill = worn, notch = goal */}
        <div
          style={{
            height: 6,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 4,
            overflow: "visible",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${wornFillPct}%`,
              height: "100%",
              borderRadius: 4,
              background: "linear-gradient(90deg, #22D3EE 0%, #4ADE80 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: -3,
              left: `${goalNotchPct}%`,
              width: 2,
              height: 12,
              background: "rgba(248,113,113,0.7)",
              borderRadius: 1,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <span style={{ fontSize: 8, color: "var(--text-faint)" }}>0h</span>
          <span style={{ fontSize: 8, color: "rgba(248,113,113,0.6)" }}>
            goal {Math.round(goalMinutes / 60)}h
          </span>
          <span style={{ fontSize: 8, color: "var(--text-faint)" }}>24h</span>
        </div>
      </div>

      {/* Secondary 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
        {secondaryItems.map((item) => (
          <div
            key={item.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "11px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 8,
                color: "var(--text-muted)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: item.color,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1,
              }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
