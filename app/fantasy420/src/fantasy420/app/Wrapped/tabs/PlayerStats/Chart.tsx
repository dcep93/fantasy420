import { useState } from "react";
import {
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FFTeamType } from "../../../FetchWrapped";
import { colors } from "../ManagerPlot";

type ScorePoint = {
  week: number;
  state: string;
  score: number | null;
  owner: FFTeamType | undefined;
};

const DEFAULT_COLOR = "#666666";

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getOwnerColor = (owner: FFTeamType | undefined) => {
  if (!owner?.id) return DEFAULT_COLOR;
  const index = hashString(owner.id) % colors.length;
  return colors[index] || DEFAULT_COLOR;
};

const Marker = (props: {
  cx?: number;
  cy?: number;
  payload?: ScorePoint & { color: string };
}) => {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  if (payload.score === null) return null;
  const color = payload.color;
  const size = 6;
  const strokeWidth = 2;
  if (payload.state === "started") {
    return (
      <g>
        <line
          x1={cx - size}
          x2={cx + size}
          y1={cy}
          y2={cy}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={cx}
          x2={cx}
          y1={cy - size}
          y2={cy + size}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </g>
    );
  }
  if (payload.state === "unowned") {
    return (
      <g>
        <line
          x1={cx - size}
          x2={cx + size}
          y1={cy - size}
          y2={cy + size}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1={cx - size}
          x2={cx + size}
          y1={cy + size}
          y2={cy - size}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </g>
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size - 2}
      fill="white"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  );
};

export default function Chart(props: {
  delayMs: number;
  scores: ScorePoint[];
}) {
  const [visible, setVisible] = useState(false);
  setTimeout(() => setVisible(true), props.delayMs);
  const data = props.scores.map((entry) => ({
    ...entry,
    color: getOwnerColor(entry.owner),
  }));
  const scatterData = data.filter((d) => d.score !== null);
  return !visible ? null : (
    <div style={{ width: "24em", height: "12em" }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ left: 16, right: 16, top: 16, bottom: 16 }}
        >
          <XAxis
            dataKey="week"
            type="number"
            domain={[1, "dataMax"]}
            allowDecimals={false}
          />
          <YAxis width={40} allowDecimals={false} />
          <Tooltip
            formatter={(value: unknown, _name: string, payload: any) => {
              if (value === null || value === undefined) return "No score";
              const num = Number(value);
              const ownerName = payload?.payload?.owner?.name;
              return [num.toFixed(2), ownerName ? ownerName : "Unowned"];
            }}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Line
            type="linear"
            dataKey="score"
            stroke="#444"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            tooltipType="none"
          />
          <Scatter
            data={scatterData}
            dataKey="score"
            isAnimationActive={false}
            shape={(props: any) => <Marker {...props} />}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
