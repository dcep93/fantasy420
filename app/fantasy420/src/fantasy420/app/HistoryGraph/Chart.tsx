import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartDataType = { name: string; ys: { [key: string]: number } }[];

export default function Chart(props: {
  data: ChartDataType;
  keys: { [key: string]: string };
}) {
  return (
    <LineChart
      width={1000}
      height={600}
      data={props.data.map((d) => ({ name: d.name, ...d.ys }))}
      margin={{
        top: 5,
        right: 30,
        left: 20,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      {Object.entries(props.keys).map(([key, stroke]) => (
        <Line key={key} type="monotone" dataKey={key} stroke={stroke} />
      ))}
    </LineChart>
  );
}
