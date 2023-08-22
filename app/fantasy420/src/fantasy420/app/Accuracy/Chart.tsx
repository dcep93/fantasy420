import { ChartDataType } from ".";

// @ts-ignore
import CanvasJSReact from "@canvasjs/react-charts";
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

export default function Chart(props: { title: string; data: ChartDataType }) {
  return (
    <div>
      <CanvasJSChart
        options={{
          title: {
            text: props.title,
          },
          data: [
            {
              type: "column",
              dataPoints: props.data,
            },
          ],
        }}
      />
    </div>
  );
}
