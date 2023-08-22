import CanvasJSReact from "@canvasjs/react-charts";
import { DataType } from ".";
var CanvasJS = CanvasJSReact.CanvasJS;
var CanvasJSChart = CanvasJSReact.CanvasJSChart;

export default function Chart(props: { data: DataType }) {
  return (
    <div>
      <CanvasJSChart
        options={{
          title: {
            text: "Basic Column Chart in React",
          },
          data: [
            {
              type: "column",
              dataPoints: [
                { label: "Apple", y: 10 },
                { label: "Orange", y: 15 },
                { label: "Banana", y: 25 },
                { label: "Mango", y: 30 },
                { label: "Grape", y: 28 },
              ],
            },
          ],
        }}
      />
    </div>
  );
}
