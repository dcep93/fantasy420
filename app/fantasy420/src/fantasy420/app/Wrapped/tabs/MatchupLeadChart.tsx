import { useId } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NIGHT_CHART_COLORS, NIGHT_COLORS } from "../../theme";
import type { LeadPoint } from "./spiciestMatchupsData";

const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 22, right: 28, bottom: 22, left: 4 };
const TIME_AXIS_HEIGHT = 30;

export function formatMatchupTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: "short", hour: "numeric", minute: "2-digit",
  });
}

export default function MatchupLeadChart({ points, homeName, awayName }: {
  points: LeadPoint[];
  homeName: string;
  awayName: string;
}) {
  const gradientId = useId();
  const data = points.map(point => ({ ...point, lead: point.scores[0] - point.scores[1] }));
  const extent = Math.max(10, Math.ceil(Math.max(...data.map(point => Math.abs(point.lead)), 0) / 10) * 10);
  return (
    <section aria-label={`Estimated points lead: ${homeName} versus ${awayName}`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1.5rem", marginBottom: 12, fontSize: 14 }}>
        <span style={{ color: NIGHT_CHART_COLORS[2] }}>Above 0: <b>{homeName}</b> leads</span>
        <span style={{ color: NIGHT_CHART_COLORS[6] }}>Below 0: <b>{awayName}</b> leads</span>
        <span style={{ color: NIGHT_COLORS.mutedText }}>0 = tied</span>
      </div>
      <div style={{ width: "100%", height: CHART_HEIGHT, background: NIGHT_COLORS.chartCanvas, borderRadius: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN} accessibilityLayer>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0"
                gradientUnits="userSpaceOnUse" y1={CHART_MARGIN.top}
                y2={CHART_HEIGHT - CHART_MARGIN.bottom - TIME_AXIS_HEIGHT}>
                <stop offset="50%" stopColor={NIGHT_CHART_COLORS[2]} />
                <stop offset="50%" stopColor={NIGHT_CHART_COLORS[6]} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={NIGHT_COLORS.chartGrid} strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" type="number" domain={["dataMin", "dataMax"]}
              height={TIME_AXIS_HEIGHT} interval="preserveStartEnd" tickFormatter={formatMatchupTime}
              minTickGap={45} tick={({ x, y, payload, index, visibleTicksCount }: any) => (
                <text x={x} y={y + 12} fill={NIGHT_COLORS.mutedText} fontSize={11}
                  textAnchor={index === 0 ? "start" : index === visibleTicksCount - 1 ? "end" : "middle"}>
                  {formatMatchupTime(payload.value)}
                </text>
              )}
              label={{ value: "Estimated local time", position: "bottom", offset: 5 }} />
            <YAxis domain={[-extent, extent]} ticks={[-extent, -extent / 2, 0, extent / 2, extent]} width={50}
              tickFormatter={value => value > 0 ? `+${value}` : String(value)} />
            <ReferenceLine y={0} stroke={NIGHT_COLORS.text} strokeWidth={1.5} />
            <Tooltip content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (LeadPoint & { lead: number }) | undefined;
              if (!active || !point) return null;
              const lead = Math.round(point.lead * 100) / 100;
              return (
                <div role="status" aria-live="polite" aria-atomic="true"
                  style={{ background: NIGHT_COLORS.tooltip, border: `1px solid ${NIGHT_COLORS.border}`,
                  borderRadius: 8, padding: 12, maxWidth: 260, color: NIGHT_COLORS.text }}>
                  <b>{formatMatchupTime(point.timestamp)}</b>
                  <div style={{ marginTop: 6 }}>{homeName}: {point.scores[0].toFixed(2)}</div>
                  <div>{awayName}: {point.scores[1].toFixed(2)}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{lead === 0 ? "Tied" :
                    `${lead > 0 ? homeName : awayName} leads by ${Math.abs(lead).toFixed(2)} pts`}</div>
                  <small style={{ color: NIGHT_COLORS.mutedText }}>Estimated scores</small>
                </div>
              );
            }} />
            <Line dataKey="lead" name="Estimated points lead" type="stepAfter" stroke={`url(#${gradientId})`}
              strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
