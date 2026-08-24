import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ScatterPointHitTarget } from "../ChartPointHitTarget";

export type ChartDataType = { x: number; y: number; label: string }[];

export default function Chart(props: { data: ChartDataType }) {
  return (
    <ScatterChart width={600} height={400}>
      <CartesianGrid />
      <XAxis type="number" dataKey="x" />
      <YAxis type="number" dataKey="y" />
      <Scatter data={props.data} shape={<ScatterPointHitTarget />} />
      <Tooltip
        content={(data) =>
          !data.active ? null : (
            <div style={{ backgroundColor: "white" }}>
              {data.payload![0].payload.label}
            </div>
          )
        }
      />
    </ScatterChart>
  );
}
