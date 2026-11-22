import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement, type ComponentType, type ReactNode } from "react";
import MatchupLeadChart, { visibleProbabilityAxis, visibleScoreAxis, winProbabilityAxisPosition } from "./MatchupLeadChart";
import { contributingPlayEvents } from "./matchupChartNavigation";
import type { LeadPoint } from "./spiciestMatchupsData";
import { buildMatchupChunks, ChunkedLeadPoint } from "./matchupTimelineChunks";

const { chartSpy, lineSpy, axisSpy, areaSpy, probabilityAxisSpy, tooltipState, resize, referenceSpy, chartKeySpy } = vi.hoisted(() => ({
  chartSpy: vi.fn(), lineSpy: vi.fn(), axisSpy: vi.fn(), areaSpy: vi.fn(), probabilityAxisSpy: vi.fn(),
  referenceSpy: vi.fn(), chartKeySpy: vi.fn(),
  tooltipState: { active: true, index: -1 }, resize: { current: (_width: number) => {} },
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children, onResize }: { children: ReactNode; onResize: (width: number) => void }) => { resize.current = onResize; return <>{children}</>; },
  LineChart: ({ children, data }: { children: ReactNode; data: ChunkedLeadPoint[] }) => {
    chartSpy(data);
    return <svg onKeyDown={chartKeySpy}>{children}</svg>;
  },
  CartesianGrid: () => null,
  XAxis: (props: unknown) => { axisSpy(props); return null; },
  YAxis: (props: unknown) => { probabilityAxisSpy(props); return null; },
  ReferenceLine: (props: unknown) => { referenceSpy(props); return null; },
  ReferenceArea: (props: unknown) => { areaSpy(props); return null; },
  Line: (props: unknown) => { lineSpy(props); return null; },
  Tooltip: ({ content }: { content: ComponentType<any> }) => <foreignObject>
    {createElement(content, { active: tooltipState.active, payload: [{ payload: chartSpy.mock.lastCall![0].at(tooltipState.index) }] })}
  </foreignObject>,
}));

beforeEach(() => { tooltipState.active = true; tooltipState.index = -1; });

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
  expect(within(screen.getByRole("region", { name: /Alpha versus Bravo/ })).getByRole("button", { name: "Reset zoom" })).toBeEnabled();
  expect(within(screen.getByRole("region", { name: /Charlie versus Bravo/ })).getByRole("button", { name: "Reset zoom" })).toBeDisabled();
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


test("zoom timestamps adapt to the measured container width and preserve reset", () => {
  render(<MatchupLeadChart {...zoomProps} />);
  const element = preparePlot(screen.getByLabelText("Drag to zoom; Escape cancels selection"));
  dragRange(element, 154, 354);
  act(() => resize.current(260));
  expect(axisSpy.mock.lastCall![0].ticks).toEqual([1, 3]);
  act(() => resize.current(800));
  expect(axisSpy.mock.lastCall![0].ticks).toEqual([1, 2, 3]);
  act(() => resize.current(260));
  fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
  expect(axisSpy.mock.lastCall![0].ticks).toEqual([0.5, 1.5, 2.5, 3.5]);
});


const play = (id: string, timestamp: number) => ({ id, timestamp, matchup: "BUF vs NYJ", clock: "Q1 10:00", text: `Play ${id}` });
const navigationPoints: LeadPoint[] = [
  { minute: 0, timestamp: 0, scores: [0, 0], projectedScores: [100, 95] },
  { minute: 10, timestamp: 600_000, scores: [5, 0], projectedScores: [101, 94], lastContributingPlays: [play("one", 600_000)] },
  { minute: 20, timestamp: 1_200_000, scores: [5, 0], projectedScores: [99, 92], lastContributingPlays: [play("one", 600_000)] },
  { minute: 30, timestamp: 1_800_000, scores: [10, 5], projectedScores: [103, 97], lastContributingPlays: [play("two", 1_800_000), play("three", 1_800_000)] },
  { minute: 40, timestamp: 2_400_000, scores: [10, 5], projectedScores: [98, 90], lastContributingPlays: [play("two", 1_800_000), play("three", 1_800_000)] },
  { minute: 50, timestamp: 3_000_000, scores: [10, 10], projectedScores: [95, 95], lastContributingPlays: [play("four", 3_000_000)] },
];
const navigationProps = { ...zoomProps, points: navigationPoints };
const previousButton = () => screen.getByRole("button", { name: "Previous play" });
const nextButton = () => screen.getByRole("button", { name: "Next play" });
const details = () => screen.getByRole("status", { name: "Matchup details" });

test("projected scores use two linear team series and real chronological positions without chunk dividers", () => {
  tooltipState.active = false;
  lineSpy.mockClear(); referenceSpy.mockClear();
  render(<MatchupLeadChart {...navigationProps} projectedScores />);
  expect(screen.getByRole("region", { name: "Projected scores: Alpha versus Bravo" })).toBeVisible();
  expect(chartSpy.mock.lastCall![0].map((point: { position: number }) => point.position)).toEqual(navigationPoints.map(point => point.timestamp));
  expect(lineSpy.mock.calls.map(([props]) => [props.dataKey, props.name, props.type])).toEqual([
    ["projectedScores.0", "Alpha", "linear"], ["projectedScores.1", "Bravo", "linear"],
  ]);
  expect(lineSpy.mock.calls[0][0].stroke).not.toEqual(lineSpy.mock.calls[1][0].stroke);
  expect(axisSpy.mock.lastCall![0].domain).toEqual([0, 3_000_000]);
  const yAxis = probabilityAxisSpy.mock.lastCall![0];
  expect(yAxis.scale).toBe("linear");
  expect(yAxis.tickFormatter(95)).toBe("95");
  expect(referenceSpy).not.toHaveBeenCalled();
  expect(screen.getByText(/One continuous timeline/)).toBeVisible();
});

test("score zoom includes interpolated edge values from both teams and ignores offscreen extrema", () => {
  const axis = visibleScoreAxis([
    { position: 0, projectedScores: [0, 200] },
    { position: 100, projectedScores: [100, 100] },
  ], [40, 60]);
  expect(axis.domain[0]).toBeLessThan(40);
  expect(axis.domain[1]).toBeGreaterThan(160);
  expect(axis.domain[0]).toBeGreaterThan(0);
  expect(axis.domain[1]).toBeLessThan(200);
  expect(axis.ticks.every((tick: number) => tick >= axis.domain[0] && tick <= axis.domain[1])).toBe(true);
  const flat = visibleScoreAxis([{ position: 0, projectedScores: [0, 0] }], null);
  expect(flat.domain[1]).toBeGreaterThan(flat.domain[0]);
  expect(visibleScoreAxis([], null).domain.every(Number.isFinite)).toBe(true);
});

test("score drag zooms timestamps, fits points, and narrows time ticks on small plots", () => {
  tooltipState.active = false;
  render(<MatchupLeadChart {...navigationProps} projectedScores />);
  const plot = preparePlot(screen.getByLabelText("Drag to zoom; Escape cancels selection"));
  dragRange(plot, 154, 354);
  expect(axisSpy.mock.lastCall![0].domain).toEqual([750_000, 2_250_000]);
  expect(probabilityAxisSpy.mock.lastCall![0].domain[0]).toBeGreaterThan(80);
  act(() => resize.current(260));
  expect(axisSpy.mock.lastCall![0].ticks).toEqual([750_000, 2_250_000]);
  fireEvent.click(screen.getByRole("button", { name: "Reset zoom" }));
  expect(axisSpy.mock.lastCall![0].domain).toEqual([0, 3_000_000]);
});

test("navigation uses original distinct contributions, skipping carried metadata and grouping simultaneous plays", () => {
  expect(contributingPlayEvents(navigationPoints)).toEqual([navigationPoints[1], navigationPoints[3], navigationPoints[5]]);
  tooltipState.active = false;
  render(<MatchupLeadChart {...navigationProps} />);
  expect(previousButton()).toBeEnabled(); expect(nextButton()).toBeEnabled();
  fireEvent.click(nextButton());
  expect(details()).toHaveTextContent("Play one");
  expect(previousButton()).toBeDisabled();
  fireEvent.click(nextButton());
  expect(details()).toHaveTextContent("Play two"); expect(details()).toHaveTextContent("Play three");
  expect(details()).not.toHaveTextContent("Play one");
  expect(referenceSpy.mock.lastCall![0]).toMatchObject({ x: expect.any(Number), strokeWidth: 2 });
  fireEvent.click(nextButton());
  expect(details()).toHaveTextContent("Play four"); expect(nextButton()).toBeDisabled();
  expect(screen.getByLabelText("Drag to zoom; Escape cancels selection")).toHaveFocus();
  fireEvent.click(previousButton());
  expect(details()).toHaveTextContent("Play two");
});

test("previous starts at the last event and arrows match buttons without leaking to Recharts", () => {
  tooltipState.active = false;
  render(<MatchupLeadChart {...navigationProps} />);
  const plot = screen.getByLabelText("Drag to zoom; Escape cancels selection");
  const svg = plot.querySelector("svg")!;
  chartKeySpy.mockClear();
  fireEvent.keyDown(svg, { key: "ArrowLeft" });
  expect(details()).toHaveTextContent("Play four");
  fireEvent.keyDown(previousButton(), { key: "ArrowLeft" });
  expect(details()).toHaveTextContent("Play two");
  fireEvent.keyDown(svg, { key: "ArrowRight" });
  expect(details()).toHaveTextContent("Play four");
  expect(chartKeySpy).not.toHaveBeenCalled();
  fireEvent.keyDown(document.body, { key: "ArrowLeft" });
  expect(details()).toHaveTextContent("Play four");
  const input = document.createElement("input"); plot.append(input);
  fireEvent.keyDown(input, { key: "ArrowLeft" });
  expect(details()).toHaveTextContent("Play four");
  input.remove();
  fireEvent.click(plot);
  expect(plot).toHaveFocus();
});

test("empty contribution sets disable both controls", () => {
  tooltipState.active = false;
  render(<MatchupLeadChart {...zoomProps} />);
  expect(previousButton()).toBeDisabled(); expect(nextButton()).toBeDisabled();
});

test("hover establishes the starting timestamp between events and selection survives a mode change", () => {
  tooltipState.index = 2;
  const view = render(<MatchupLeadChart {...navigationProps} projectedScores />);
  expect(details()).toHaveTextContent("99.00 projected finish");
  tooltipState.active = false;
  view.rerender(<MatchupLeadChart {...navigationProps} projectedScores />);
  fireEvent.click(previousButton());
  expect(details()).toHaveTextContent("101.00 projected finish");
  const plot = preparePlot(screen.getByLabelText("Drag to zoom; Escape cancels selection"));
  dragRange(plot, 154, 354);
  view.rerender(<MatchupLeadChart {...navigationProps} />);
  expect(screen.getByRole("button", { name: "Reset zoom" })).toBeDisabled();
  expect(axisSpy.mock.lastCall![0].domain).toEqual([0, 4]);
  expect(details()).toHaveTextContent("Play one");
  fireEvent.click(nextButton());
  expect(details()).toHaveTextContent("Play two");
});

test("navigation outside a zoom restores the full timeline and each matchup keeps its own selection", () => {
  tooltipState.active = false;
  render(<><MatchupLeadChart {...navigationProps} projectedScores /><MatchupLeadChart {...navigationProps} projectedScores homeName="Charlie" /></>);
  const first = screen.getByRole("region", { name: /Alpha versus Bravo/ });
  const second = screen.getByRole("region", { name: /Charlie versus Bravo/ });
  dragRange(preparePlot(within(first).getByLabelText("Drag to zoom; Escape cancels selection")), 154, 354);
  fireEvent.click(within(first).getByRole("button", { name: "Next play" }));
  expect(within(first).getByRole("button", { name: "Reset zoom" })).toBeDisabled();
  expect(within(first).getByRole("status", { name: "Matchup details" })).toHaveTextContent("Play one");
  expect(within(second).getByRole("status", { name: "Matchup details" })).not.toHaveTextContent("Play one");
});


test("a stale active tooltip cannot overwrite navigation or selection when changing modes", () => {
  const view = render(<MatchupLeadChart {...navigationProps} />);
  expect(details()).toHaveTextContent("Play four");
  fireEvent.click(previousButton());
  expect(details()).toHaveTextContent("Play two");
  view.rerender(<MatchupLeadChart {...navigationProps} projectedScores />);
  expect(details()).toHaveTextContent("Play two");
  expect(referenceSpy.mock.lastCall![0].x).toBe(1_800_000);
  view.rerender(<MatchupLeadChart {...navigationProps} />);
  expect(details()).toHaveTextContent("Play two");
  fireEvent.click(nextButton());
  expect(details()).toHaveTextContent("Play four");
});

test("next starts after a hovered projection-only point and pointer tracking resumes after navigation", () => {
  tooltipState.index = 2;
  const view = render(<MatchupLeadChart {...navigationProps} projectedScores />);
  fireEvent.click(nextButton());
  expect(details()).toHaveTextContent("Play two");
  const plot = screen.getByLabelText("Drag to zoom; Escape cancels selection");
  fireEvent.pointerMove(plot, { clientX: 150 });
  tooltipState.index = 1;
  view.rerender(<MatchupLeadChart {...navigationProps} projectedScores />);
  expect(details()).toHaveTextContent("Play one");
  expect(referenceSpy.mock.lastCall![0].x).toBe(600_000);
});


test("active hover settles without a render loop when Recharts mounts tooltip content", () => {
  chartSpy.mockClear();
  chartSpy.mockImplementation(() => {
    // Fail promptly instead of allowing a runaway effect to hang the test process.
    if (chartSpy.mock.calls.length > 10) throw new Error("Hover repeatedly rendered without a new point");
  });
  try {
    render(<MatchupLeadChart {...navigationProps} projectedScores />);
    expect(details()).toHaveTextContent("Play four");
    expect(chartSpy.mock.calls.length).toBeLessThan(10);
  } finally { chartSpy.mockReset(); }
});

test.each(["altKey", "ctrlKey", "metaKey", "shiftKey"])("%s arrows retain the play and leave modified shortcuts unhandled", modifier => {
  tooltipState.active = false;
  render(<MatchupLeadChart {...navigationProps} />);
  fireEvent.click(nextButton());
  const plot = screen.getByLabelText("Drag to zoom; Escape cancels selection");
  const event = new KeyboardEvent("keydown", { key: "ArrowRight", [modifier]: true, bubbles: true, cancelable: true });
  chartKeySpy.mockClear();
  act(() => { plot.querySelector("svg")!.dispatchEvent(event); });
  expect(chartKeySpy).not.toHaveBeenCalled();
  expect(details()).toHaveTextContent("Play one");
  expect(event.defaultPrevented).toBe(false);
  fireEvent.keyDown(plot, { key: "ArrowRight" });
  expect(details()).toHaveTextContent("Play two");
});
