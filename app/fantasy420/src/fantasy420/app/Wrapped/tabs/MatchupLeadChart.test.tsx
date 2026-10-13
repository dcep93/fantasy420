import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import MatchupLeadChart from "./MatchupLeadChart";
import { buildMatchupChunks, ChunkedLeadPoint } from "./matchupTimelineChunks";

const { chartSpy, lineSpy } = vi.hoisted(() => ({ chartSpy: vi.fn(), lineSpy: vi.fn() }));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  LineChart: ({ children, data }: { children: ReactNode; data: ChunkedLeadPoint[] }) => {
    chartSpy(data);
    return <svg>{children}</svg>;
  },
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  ReferenceLine: () => null,
  Line: (props: unknown) => { lineSpy(props); return null; },
  Tooltip: ({ content }: { content: (props: unknown) => ReactNode }) => <foreignObject>
    {content({ active: true, payload: [{ payload: chartSpy.mock.lastCall![0].at(-1) }] })}
  </foreignObject>,
}));

test("plots Multisport win probability and labels earned scores and projected finishes", () => {
  render(<MatchupLeadChart homeName="Alpha" awayName="Bravo"
    chunks={buildMatchupChunks([{ start: 0, end: 180 * 60_000 }])}
    points={[
      { minute: 0, timestamp: 0, scores: [0, 0], projectedScores: [30, 40] },
      { minute: 90, timestamp: 90 * 60_000, scores: [10, 20], projectedScores: [25, 21] },
    ]} />);
  expect(screen.getByRole("region", { name: "Estimated win probability: Alpha versus Bravo" })).toBeVisible();
  expect(screen.getByText("10.00 earned · 25.00 projected finish")).toBeVisible();
  expect(screen.getByText("20.00 earned · 21.00 projected finish")).toBeVisible();
  expect(screen.getByText("64.4% chance to win")).toBeVisible();
  expect(screen.getByText("35.6% chance to win")).toBeVisible();
  expect(chartSpy.mock.lastCall![0].at(-1).winProbability).toBeGreaterThan(64);
  expect(chartSpy.mock.lastCall![0].at(-1).winProbability).toBeLessThan(65);
  expect(lineSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "linear", dataKey: "winProbability" }));
});


test.each([
  {scores:[20,10],expected:100},
  {scores:[10,20],expected:0},
  {scores:[10,10],expected:50},
])("finished matchup resolves to $expected percent", ({scores,expected}) => {
  render(<MatchupLeadChart homeName="Alpha" awayName="Bravo"
    chunks={buildMatchupChunks([{start:0,end:180*60_000}])}
    points={[{minute:180,timestamp:180*60_000,scores:scores as [number,number],projectedScores:scores as [number,number]}]}/>);
  expect(chartSpy.mock.lastCall![0].at(-1).winProbability).toBe(expected);
  if(expected===50)expect(screen.getByText("Final tie · shown at 50%")).toBeVisible();
});

test("the same projected margin grows more decisive as remaining uncertainty shrinks", () => {
  render(<MatchupLeadChart homeName="Alpha" awayName="Bravo"
    chunks={buildMatchupChunks([{start:0,end:180*60_000}])}
    points={[
      {minute:0,timestamp:0,scores:[0,0],projectedScores:[100,95]},
      {minute:170,timestamp:170*60_000,scores:[99,94],projectedScores:[100,95]},
    ]}/>);
  const data=chartSpy.mock.lastCall![0];
  expect(data.at(-1).winProbability).toBeGreaterThan(data[0].winProbability);
  expect(data[0].winProbability).toBeGreaterThan(50);
  expect(data[0].winProbability).toBeLessThan(60);
});
