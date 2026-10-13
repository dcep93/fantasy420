import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import MatchupLeadChart, { visibleProbabilityAxis, winProbabilityAxisPosition } from "./MatchupLeadChart";
import { buildMatchupChunks, ChunkedLeadPoint } from "./matchupTimelineChunks";

const { chartSpy, lineSpy, axisSpy, areaSpy, probabilityAxisSpy, tooltipState } = vi.hoisted(() => ({
  chartSpy: vi.fn(), lineSpy: vi.fn(), axisSpy: vi.fn(), areaSpy: vi.fn(), probabilityAxisSpy: vi.fn(),
  tooltipState: { active: true },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  LineChart: ({ children, data }: { children: ReactNode; data: ChunkedLeadPoint[] }) => {
    chartSpy(data);
    return <svg>{children}</svg>;
  },
  CartesianGrid: () => null,
  XAxis: (props: unknown) => { axisSpy(props); return null; },
  YAxis: (props: unknown) => { probabilityAxisSpy(props); return null; },
  ReferenceLine: () => null,
  ReferenceArea: (props: unknown) => { areaSpy(props); return null; },
  Line: (props: unknown) => { lineSpy(props); return null; },
  Tooltip: ({ content }: { content: (props: unknown) => ReactNode }) => <foreignObject>
    {content({ active: tooltipState.active, payload: [{ payload: chartSpy.mock.lastCall![0].at(-1) }] })}
  </foreignObject>,
}));

beforeEach(() => { tooltipState.active = true; });

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
  expect(chartSpy.mock.lastCall![0].at(-1).probabilityPosition).toBeGreaterThan(76);
  expect(lineSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "linear", dataKey: "probabilityPosition" }));
  const axis = probabilityAxisSpy.mock.lastCall![0];
  expect(axis.ticks.map(axis.tickFormatter)).toEqual(["0%", "25%", "40%", "50%", "60%", "75%", "100%"]);
  expect(axis.ticks[2]).toBeLessThan(30); // A real 40% is drawn farther from the center.
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
  expect(chartSpy.mock.lastCall![0].at(-1).probabilityPosition).toBe(expected);
  if(expected===50)expect(screen.getByText("Final tie · shown at 50%")).toBeVisible();
});

test.each([[51, 57.0710678], [75, 85.3553391], [1, 0.5025253]])(
  "draws %s percent at the requested square-root position %s", (probability, position) => {
    expect(winProbabilityAxisPosition(probability)).toBeCloseTo(position, 6);
  }
);

test("the visual scale preserves ordering, symmetry, midpoint and endpoints", () => {
  const probabilities = [0, 1, 25, 49, 49.99, 50, 50.01, 51, 75, 99, 100];
  const positions = probabilities.map(winProbabilityAxisPosition);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  for (const probability of probabilities) {
    expect(winProbabilityAxisPosition(probability) + winProbabilityAxisPosition(100 - probability)).toBeCloseTo(100);
  }
  expect([0, 50, 100].map(winProbabilityAxisPosition)).toEqual([0, 50, 100]);
});

const axisPoint = (position: number, probability: number) => ({ position, probabilityPosition: winProbabilityAxisPosition(probability) });

test("zoom fits visible extrema with padding and ignores offscreen probabilities", () => {
  const axis = visibleProbabilityAxis([axisPoint(0, 0), axisPoint(1, 47), axisPoint(2, 54), axisPoint(3, 51), axisPoint(4, 100)], [1, 3]);
  expect(axis.domain[0]).toBeLessThan(winProbabilityAxisPosition(47));
  expect(axis.domain[1]).toBeGreaterThan(winProbabilityAxisPosition(54));
  expect(axis.ticks[0].probability).toBeGreaterThan(40);
  expect(axis.ticks.at(-1)!.probability).toBeLessThan(60);
  expect((winProbabilityAxisPosition(54) - winProbabilityAxisPosition(47)) / (axis.domain[1] - axis.domain[0])).toBeGreaterThan(0.75);
  expect(axis.favoriteOffset).not.toBe(50);
  expect(axis.favoriteOffset).toBeCloseTo((axis.domain[1] - 50) / (axis.domain[1] - axis.domain[0]) * 100);
});

test("fits interpolated segment edges when no sampled point is inside the zoom", () => {
  const axis = visibleProbabilityAxis([axisPoint(0, 0), axisPoint(4, 100)], [1.9, 2.1]);
  expect(axis.domain[0]).toBeLessThan(47.5);
  expect(axis.domain[1]).toBeGreaterThan(52.5);
  expect(axis.ticks[0].probability).toBeGreaterThanOrEqual(49);
  expect(axis.ticks.at(-1)!.probability).toBeLessThanOrEqual(51);
});

test.each([0, 50, 100])("flat %s percent zoom remains padded, bounded, and correctly colored", probability => {
  const axis = visibleProbabilityAxis([axisPoint(0, probability), axisPoint(4, probability)], [1, 3]);
  expect(axis.domain[1]).toBeGreaterThan(axis.domain[0]);
  expect(axis.domain[0]).toBeGreaterThanOrEqual(0);
  expect(axis.domain[1]).toBeLessThanOrEqual(100);
  expect(axis.domain[0]).toBeLessThanOrEqual(winProbabilityAxisPosition(probability));
  expect(axis.domain[1]).toBeGreaterThanOrEqual(winProbabilityAxisPosition(probability));
  expect(axis.favoriteOffset).toBeCloseTo(probability);
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
  expect(probabilityAxisSpy.mock.lastCall![0].domain[1]).toBeLessThan(100);
  expect(probabilityAxisSpy.mock.lastCall![0].allowDataOverflow).toBe(true);
  dragRange(element, 154, 354);
  expect(axisSpy.mock.lastCall![0].domain).toEqual([1.5, 2.5]);
  fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
  expect(axisSpy.mock.lastCall![0].domain).toEqual([0, 4]);
  expect(probabilityAxisSpy.mock.lastCall![0].domain).toEqual([0, 100]);
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

test("keeps inspected details below the plot after pointer exit and clears stale data", () => {
  const view = render(<MatchupLeadChart {...zoomProps} />);
  const plot = screen.getByLabelText("Drag to zoom; Escape cancels selection");
  const panel = screen.getByRole("status", { name: "Matchup details" });
  expect(panel).toHaveTextContent("35.00 earned · 35.00 projected finish");
  expect(plot).not.toContainElement(panel);
  expect(plot.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(plot).queryByText(/earned/)).not.toBeInTheDocument();

  tooltipState.active = false;
  view.rerender(<MatchupLeadChart {...zoomProps} />);
  expect(panel).toHaveTextContent("35.00 earned · 35.00 projected finish");
  view.rerender(<MatchupLeadChart {...zoomProps} points={[{ ...zoomProps.points[0] }]} />);
  expect(panel).toHaveTextContent("Hover or tap a point on the graph to see its details here.");
  expect(panel).not.toHaveTextContent("35.00 earned");
});
