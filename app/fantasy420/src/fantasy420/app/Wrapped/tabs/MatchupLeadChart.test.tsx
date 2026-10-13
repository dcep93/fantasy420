import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import MatchupLeadChart from "./MatchupLeadChart";
import { buildMatchupChunks, ChunkedLeadPoint } from "./matchupTimelineChunks";

const { chartSpy, lineSpy, axisSpy, areaSpy } = vi.hoisted(() => ({
  chartSpy: vi.fn(), lineSpy: vi.fn(), axisSpy: vi.fn(), areaSpy: vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  LineChart: ({ children, data }: { children: ReactNode; data: ChunkedLeadPoint[] }) => {
    chartSpy(data);
    return <svg>{children}</svg>;
  },
  CartesianGrid: () => null,
  XAxis: (props: unknown) => { axisSpy(props); return null; },
  YAxis: () => null,
  ReferenceLine: () => null,
  ReferenceArea: (props: unknown) => { areaSpy(props); return null; },
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

const zoomProps = {
  homeName: "Alpha", awayName: "Bravo",
  chunks: buildMatchupChunks([{ start: 0, end: 180 * 60_000 }]),
  points: [
    { minute: 0, timestamp: 0, scores: [0, 0] as [number, number], projectedScores: [30, 40] as [number, number] },
    { minute: 180, timestamp: 180 * 60_000, scores: [35, 40] as [number, number], projectedScores: [35, 40] as [number, number] },
  ],
};

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

beforeAll(() => { vi.stubGlobal("PointerEvent", TestPointerEvent); });
afterAll(() => { vi.unstubAllGlobals(); });

function preparePlot(element: HTMLElement) {
  // 54px left axis/margin + 400px plot + 28px right margin.
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 482, height: 300 } as DOMRect);
  element.setPointerCapture = vi.fn();
  element.hasPointerCapture = vi.fn(() => false);
  return element;
}
function move(element: HTMLElement, kind: "pointerDown" | "pointerMove" | "pointerUp", x: number) {
  fireEvent[kind](element, { clientX: x, clientY: 100, button: 0, pointerId: 1 });
}
function dragRange(element: HTMLElement, start: number, end: number) {
  move(element, "pointerDown", start);
  move(element, "pointerMove", end);
  move(element, "pointerUp", end);
}

test.each([[154, 354], [354, 154]])("zooms a drag from %s to %s and resets the full domain", (start, end) => {
  render(<MatchupLeadChart {...zoomProps} />);
  const element = preparePlot(screen.getByLabelText("Drag to zoom; Escape cancels selection"));
  expect(screen.getByRole("button", { name: "Reset zoom" })).toBeDisabled();
  move(element, "pointerDown", start);
  move(element, "pointerMove", end);
  expect(areaSpy.mock.lastCall![0]).toMatchObject({ x1: 1, x2: 3, y1: 0, y2: 100 });
  move(element, "pointerUp", end);
  expect(axisSpy.mock.lastCall![0]).toMatchObject({ domain: [1, 3], allowDataOverflow: true, ticks: [1, 2, 3] });
  expect(screen.getByRole("button", { name: "Reset zoom" })).toBeEnabled();
  dragRange(element, 154, 354);
  expect(axisSpy.mock.lastCall![0].domain).toEqual([1.5, 2.5]);
  fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
  expect(axisSpy.mock.lastCall![0].domain).toEqual([0, 4]);
  expect(screen.getByRole("button", { name: "Reset zoom" })).toBeDisabled();
});

test("clicks, tiny drags, canceled gestures and Escape do not zoom", () => {
  render(<MatchupLeadChart {...zoomProps} />);
  const element = preparePlot(screen.getByLabelText("Drag to zoom; Escape cancels selection"));
  dragRange(element, 200, 200);
  dragRange(element, 200, 204);
  for (const cancel of [() => fireEvent.pointerCancel(element), () => fireEvent.keyDown(element, { key: "Escape" })]) {
    move(element, "pointerDown", 154);
    move(element, "pointerMove", 354);
    cancel();
    move(element, "pointerUp", 354);
  }
  expect(axisSpy.mock.lastCall![0].domain).toEqual([0, 4]);
  expect(screen.getByRole("button", { name: "Reset zoom" })).toBeDisabled();
});

test("clamps release outside the plot and does not zoom another matchup", () => {
  render(<><MatchupLeadChart {...zoomProps} /><MatchupLeadChart {...zoomProps} homeName="Charlie" /></>);
  const graphs = screen.getAllByLabelText("Drag to zoom; Escape cancels selection");
  const element = preparePlot(graphs[0]);
  dragRange(element, 154, 600);
  expect(axisSpy.mock.lastCall![0].domain).toEqual([1, 4]);
  expect(within(screen.getByRole("region", { name: /Alpha versus Bravo/ })).getByRole("button")).toBeEnabled();
  expect(within(screen.getByRole("region", { name: /Charlie versus Bravo/ })).getByRole("button")).toBeDisabled();
});

test("shows original play text, matchup, game clock and separate approximate contribution time", () => {
  render(<MatchupLeadChart {...zoomProps} points={[{ ...zoomProps.points[1], lastContributingPlays: [{
    id: "play", timestamp: 60 * 60_000, matchup: "BUF vs NYJ", clock: "Q2 10:00", text: "B.Catcher catches for 12 yards.",
  }] }]} />);
  expect(screen.getByText("BUF vs NYJ · Q2 10:00")).toBeVisible();
  expect(screen.getByText("B.Catcher catches for 12 yards.")).toBeVisible();
  expect(screen.getByText(/^Approx\./)).toBeVisible();
  expect(screen.getByText("Latest reconstructed contribution")).toBeVisible();
});
