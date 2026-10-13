import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from "react";
import { headToHeadProbability } from "../../Scoreboard/probability";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { NIGHT_CHART_COLORS, NIGHT_COLORS } from "../../theme";
import type { LeadPoint } from "./spiciestMatchupsData";
import { chunkMatchupPoints, MatchupChunk } from "./matchupTimelineChunks";

const CHART_HEIGHT = 300;
const CHART_MARGIN = { top: 22, right: 28, bottom: 22, left: 4 };
const TIME_AXIS_HEIGHT = 48;
const SCORE_AXIS_WIDTH = 50;
type Range = [number, number];
type InspectedPoint = LeadPoint & { winProbability: number };

/** Signed square-root display scale; input and output are on a 0–100 scale. */
export function winProbabilityAxisPosition(probability: number): number {
  const distance = (probability - 50) / 50;
  return 50 + Math.sign(distance) * 50 * Math.sqrt(Math.abs(distance));
}

const probabilityTicks = [0, 25, 40, 50, 60, 75, 100].map(probability => ({
  probability, position: winProbabilityAxisPosition(probability),
}));

function timestampAtPosition(data: { position: number; timestamp: number }[], position: number) {
  const next = data.findIndex(point => point.position > position);
  if (next < 0) return data.at(-1)?.timestamp ?? 0;
  if (next === 0) return data[0].timestamp;
  const before = data[next - 1];
  const after = data[next];
  return before.timestamp + (after.timestamp - before.timestamp) *
    (position - before.position) / (after.position - before.position);
}

export function formatMatchupTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    weekday: "short", hour: "numeric", minute: "2-digit",
  });
}

export default function MatchupLeadChart({ points, chunks, homeName, awayName }: {
  points: LeadPoint[];
  chunks: MatchupChunk[];
  homeName: string;
  awayName: string;
}) {
  const gradientId = useId();
  const [zoom, setZoom] = useState<Range | null>(null);
  const [selection, setSelection] = useState<Range | null>(null);
  const [inspectedPoint, setInspectedPoint] = useState<InspectedPoint | null>(null);
  const drag = useRef<{ pointerId: number; start: number; clientX: number } | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const domain: Range = zoom ?? [0, 4];
  const data = useMemo(() => chunkMatchupPoints(points, chunks).map(point => {
    const winProbability = 100 * headToHeadProbability(
      { score: point.scores[0], projected: point.projectedScores[0] },
      { score: point.scores[1], projected: point.projectedScores[1] }
    );
    return { ...point, winProbability, probabilityPosition: winProbabilityAxisPosition(winProbability) };
  }), [points, chunks]);

  function cancelSelection() {
    if (drag.current && plot.current?.hasPointerCapture?.(drag.current.pointerId)) {
      plot.current.releasePointerCapture(drag.current.pointerId);
    }
    drag.current = null;
    setSelection(null);
  }
  useEffect(() => { cancelSelection(); setZoom(null); }, [points, chunks]);

  function pointerPosition(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const left = CHART_MARGIN.left + SCORE_AXIS_WIDTH;
    const width = rect.width - left - CHART_MARGIN.right;
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left - left) / width));
    return domain[0] + fraction * (domain[1] - domain[0]);
  }
  function beginSelection(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || drag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < CHART_MARGIN.left + SCORE_AXIS_WIDTH || x > rect.width - CHART_MARGIN.right ||
      y < CHART_MARGIN.top || y > CHART_HEIGHT - CHART_MARGIN.bottom - TIME_AXIS_HEIGHT) return;
    drag.current = { pointerId: event.pointerId, start: pointerPosition(event), clientX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveSelection(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.current.clientX) >= 8) {
      setSelection([drag.current.start, pointerPosition(event)]);
    } else setSelection(null);
  }
  function finishSelection(event: PointerEvent<HTMLDivElement>) {
    const started = drag.current;
    if (!started || started.pointerId !== event.pointerId) return;
    const end = pointerPosition(event);
    if (Math.abs(event.clientX - started.clientX) >= 8 && Math.abs(end - started.start) > 0.000001) {
      setZoom([Math.min(started.start, end), Math.max(started.start, end)]);
    }
    cancelSelection();
  }
  const ticks = zoom ? [0, 0.5, 1].map(fraction => domain[0] + fraction * (domain[1] - domain[0])) :
    [0.5, 1.5, 2.5, 3.5];
  return (
    <section aria-label={`Estimated win probability: ${homeName} versus ${awayName}`}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 1.5rem", marginBottom: 12, fontSize: 14 }}>
        <span style={{ color: NIGHT_CHART_COLORS[2] }}>Above 50%: <b>{homeName}</b> favored</span>
        <span style={{ color: NIGHT_CHART_COLORS[6] }}>Below 50%: <b>{awayName}</b> favored</span>
        <span style={{ color: NIGHT_COLORS.mutedText }}>50% = neither team favored</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <button type="button" disabled={!zoom} onClick={() => { cancelSelection(); setZoom(null); }}>
          Reset zoom
        </button>
        <span role="status" style={{ color: NIGHT_COLORS.mutedText, fontSize: 12 }}>
          {zoom ? `${formatMatchupTime(timestampAtPosition(data, zoom[0]))} – ${formatMatchupTime(timestampAtPosition(data, zoom[1]))}` :
            "Full week · drag across the graph to zoom"}
        </span>
      </div>
      <div ref={plot} tabIndex={0} aria-label="Drag to zoom; Escape cancels selection"
        onPointerDown={beginSelection} onPointerMove={moveSelection} onPointerUp={finishSelection}
        onPointerCancel={cancelSelection} onLostPointerCapture={cancelSelection}
        onKeyDown={event => { if (event.key === "Escape") cancelSelection(); }}
        style={{ width: "100%", height: CHART_HEIGHT, background: NIGHT_COLORS.chartCanvas, borderRadius: 10,
          touchAction: "pan-y", userSelect: "none", cursor: "crosshair" }}>
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
            <XAxis dataKey="position" type="number" domain={domain} allowDataOverflow
              ticks={ticks} height={TIME_AXIS_HEIGHT} interval={0}
              tick={({ x, y, payload }: any) => {
                if (zoom) return <text x={x} y={y + 16} fill={NIGHT_COLORS.mutedText} fontSize={11}
                  textAnchor={payload.value === domain[0] ? "start" : payload.value === domain[1] ? "end" : "middle"}>
                  {formatMatchupTime(timestampAtPosition(data, payload.value))}
                </text>;
                const label = chunks[Math.floor(payload.value)].label;
                const words = label.split(" ");
                const lines = words.length > 2 ? [words[0], words.slice(1, -1).join(" "), words.at(-1)] : words;
                return <text x={x} y={y + 12} fill={NIGHT_COLORS.mutedText} fontSize={11}
                  textAnchor="middle" aria-label={label}>
                  {lines.map((line, index) => <tspan key={index} x={x} dy={index ? 12 : 0}>{line}</tspan>)}
                </text>;
              }} />
            <YAxis domain={[0, 100]} ticks={probabilityTicks.map(tick => tick.position)} width={SCORE_AXIS_WIDTH}
              tickFormatter={value => `${probabilityTicks.find(tick => tick.position === value)?.probability ?? ""}%`} />
            <ReferenceLine y={50} stroke={NIGHT_COLORS.text} strokeWidth={1.5} />
            {[1, 2, 3].filter(position => position > domain[0] && position < domain[1]).map(position => <ReferenceLine key={position} x={position}
              stroke={NIGHT_COLORS.mutedText} strokeDasharray="4 4" />)}
            <Tooltip content={({ active, payload }) => <CaptureInspection
              active={Boolean(active) && !selection}
              point={payload?.[0]?.payload as InspectedPoint | undefined}
              onInspect={setInspectedPoint} />} />
            <Line dataKey="probabilityPosition" name={`${homeName} win probability`} type="linear" stroke={`url(#${gradientId})`}
              strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            {selection && <ReferenceArea x1={Math.min(...selection)} x2={Math.max(...selection)} y1={0} y2={100}
              fill={NIGHT_CHART_COLORS[2]} fillOpacity={0.2} stroke={NIGHT_CHART_COLORS[2]} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <MatchupDetails point={data.some(point => point === inspectedPoint) ? inspectedPoint : null}
        homeName={homeName} awayName={awayName} />
      <p style={{ color: NIGHT_COLORS.mutedText, fontSize: 12, lineHeight: 1.5, margin: "8px 0 0" }}>
        Square-root probability scale: movement near 50% is enlarged; labels and details show actual probabilities.{" "}
        Four equal-width chunks; idle gaps are compressed. Slots use Eastern kickoff dates and the week’s
        final Sunday kickoff. The line is the first team’s estimated win probability. Drag horizontally to zoom;
        hover or tap to update the details below with probabilities, points, and the latest contributing play. Play times and contributions are
        reconstructed; projection decay can move the line without a new play.
      </p>
    </section>
  );
}


/** Keep Recharts' hover/touch/keyboard tracking, but render no floating content. */
function CaptureInspection({ active, point, onInspect }: {
  active: boolean;
  point?: InspectedPoint;
  onInspect: (point: InspectedPoint) => void;
}) {
  useEffect(() => { if (active && point) onInspect(point); }, [active, point, onInspect]);
  return null;
}

function MatchupDetails({ point, homeName, awayName }: {
  point: InspectedPoint | null;
  homeName: string;
  awayName: string;
}) {
  const finalTie = point && point.scores[0] === point.scores[1] &&
    point.projectedScores.every((score, index) => score === point.scores[index]);
  return (
    <div role="status" aria-label="Matchup details" aria-live="polite" aria-atomic="true"
      style={{ marginTop: 12, padding: 16, minHeight: 190, boxSizing: "border-box",
        background: NIGHT_COLORS.tooltip, border: `1px solid ${NIGHT_COLORS.border}`,
        borderRadius: 8, color: NIGHT_COLORS.text, overflowWrap: "anywhere" }}>
      {!point ? <span style={{ color: NIGHT_COLORS.mutedText }}>Hover or tap a point on the graph to see its details here.</span> : <>
        <b>{formatMatchupTime(point.timestamp)}</b>
        {finalTie && <div style={{ marginTop: 6 }}>Final tie · shown at 50%</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: 16, marginTop: 10 }}>
          {[homeName, awayName].map((name, index) => <div key={index}>
            <b style={{ color: NIGHT_CHART_COLORS[index === 0 ? 2 : 6] }}>{name}</b>
            {!finalTie && <div>{(index === 0 ? point.winProbability : 100 - point.winProbability).toFixed(1)}% chance to win</div>}
            <div>{point.scores[index].toFixed(2)} earned · {point.projectedScores[index].toFixed(2)} projected finish</div>
          </div>)}
          <div>
            <b>Latest reconstructed contribution{(point.lastContributingPlays?.length ?? 0) > 1 ? "s" : ""}</b>
            {point.lastContributingPlays?.length ? point.lastContributingPlays.map(play =>
              <div key={play.id} style={{ marginTop: 6 }}>
                <div><b>{play.matchup} · {play.clock}</b></div>
                <small style={{ color: NIGHT_COLORS.mutedText }}>Approx. {formatMatchupTime(play.timestamp)}</small>
                <div>{play.text}</div>
              </div>) : <div>No contributing play available at this time.</div>}
          </div>
        </div>
        <small style={{ display: "block", marginTop: 12, color: NIGHT_COLORS.mutedText }}>
          Estimated probability · Multisport model with reconstructed scores
        </small>
      </>}
    </div>
  );
}
