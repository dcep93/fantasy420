import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartDataType = { x: number; y: number; label: string }[];

export default function Chart(props: { data: ChartDataType }) {
  return (
    <ScatterChart width={600} height={400}>
      <CartesianGrid />
      <XAxis type="number" dataKey="x" />
      <YAxis type="number" dataKey="y" />
      <Scatter data={props.data} />{" "}
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
