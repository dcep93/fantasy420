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

test("plots projected margin and labels both earned scores and projected finishes in the tooltip", () => {
  render(<MatchupLeadChart homeName="Alpha" awayName="Bravo"
    chunks={buildMatchupChunks([{ start: 0, end: 180 * 60_000 }])}
    points={[
      { minute: 0, timestamp: 0, scores: [0, 0], projectedScores: [30, 40] },
      { minute: 90, timestamp: 90 * 60_000, scores: [10, 20], projectedScores: [25, 21] },
    ]} />);
  expect(screen.getByRole("region", { name: "Estimated projected finish: Alpha versus Bravo" })).toBeVisible();
  expect(screen.getByText("10.00 earned · 25.00 projected finish")).toBeVisible();
  expect(screen.getByText("20.00 earned · 21.00 projected finish")).toBeVisible();
  expect(screen.getByText("Alpha projected to win by 4.00 pts")).toBeVisible();
  expect(chartSpy.mock.lastCall![0].at(-1).lead).toBe(4);
  expect(lineSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "linear", dataKey: "lead" }));
});
