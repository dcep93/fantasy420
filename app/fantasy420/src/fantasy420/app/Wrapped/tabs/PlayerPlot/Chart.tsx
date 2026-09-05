import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScatterPointHitTarget } from "../ChartPointHitTarget";
import { NIGHT_COLORS } from "../../../theme";
import { useCoarsePointer } from "./useCoarsePointer";

export type ChartDataType = { x: number; y: number; label: string }[];

export default function Chart(props: { data: ChartDataType }) {
  const isCoarsePointer = useCoarsePointer();

  return (
    <ScatterChart width={600} height={400}>
      <CartesianGrid />
      <XAxis type="number" dataKey="x" />
      <YAxis type="number" dataKey="y" />
      <Scatter
        data={props.data}
        shape={
          <ScatterPointHitTarget expandedHitTarget={isCoarsePointer} />
        }
      />
      <Tooltip
        trigger={isCoarsePointer ? "click" : "hover"}
        content={(data) =>
          !data.active ? null : (
            <div
              style={{
                color: NIGHT_COLORS.text,
                backgroundColor: NIGHT_COLORS.tooltip,
                border: `1px solid ${NIGHT_COLORS.border}`,
                padding: "0.5em",
              }}
            >
              {data.payload![0].payload.label}
            </div>
          )
        }
      />
    </ScatterChart>
  );
}
