import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { NIGHT_COLORS } from "../../../theme";

const { tooltipSpy } = vi.hoisted(() => ({ tooltipSpy: vi.fn() }));

vi.mock("recharts", () => ({
  ComposedChart: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Line: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Scatter: () => null,
  Tooltip: (props: unknown) => {
    tooltipSpy(props);
    return null;
  },
  XAxis: () => null,
  YAxis: () => null,
}));

import Chart from "./Chart";

beforeEach(() => {
  vi.useFakeTimers();
  tooltipSpy.mockClear();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

test("applies the night theme to every tooltip text layer", () => {
  render(
    <Chart
      delayMs={0}
      scores={[
        {
          week: 14,
          state: "started",
          score: 19.04,
          owner: undefined,
        },
      ]}
    />
  );

  act(() => vi.advanceTimersByTime(0));

  expect(tooltipSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      contentStyle: {
        backgroundColor: NIGHT_COLORS.tooltip,
        border: `1px solid ${NIGHT_COLORS.chartGrid}`,
        color: NIGHT_COLORS.text,
      },
      itemStyle: { color: NIGHT_COLORS.text },
      labelStyle: { color: NIGHT_COLORS.text },
    })
  );
});
