import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  CHART_POINT_HIT_RADIUS,
  ChartPointHitTarget,
  ScatterPointHitTarget,
} from "./ChartPointHitTarget";

test("adds an invisible forty-four-pixel pointer target without changing its marker", () => {
  const onPointerUp = vi.fn();
  const rendered = render(
    <svg>
      <ChartPointHitTarget cx={12} cy={34} onPointerUp={onPointerUp}>
        <circle data-testid="visible-marker" cx={12} cy={34} r={5} />
      </ChartPointHitTarget>
    </svg>
  );
  const target = rendered.container.querySelector(
    '[data-chart-point-hit-target="true"]'
  );

  expect(target).toHaveAttribute("cx", "12");
  expect(target).toHaveAttribute("cy", "34");
  expect(target).toHaveAttribute("r", String(CHART_POINT_HIT_RADIUS));
  expect(target).toHaveAttribute("fill", "transparent");
  expect(target).toHaveAttribute("pointer-events", "all");
  expect(screen.getByTestId("visible-marker")).toHaveAttribute("r", "5");

  fireEvent.pointerUp(target!);
  expect(onPointerUp).toHaveBeenCalledTimes(1);
});

test("preserves the standard visible scatter marker", () => {
  const rendered = render(
    <svg>
      <ScatterPointHitTarget cx={8} cy={9} fill="#123456" />
    </svg>
  );
  const circles = rendered.container.querySelectorAll("circle");

  expect(circles).toHaveLength(2);
  expect(circles[1]).toHaveAttribute("cx", "8");
  expect(circles[1]).toHaveAttribute("cy", "9");
  expect(circles[1]).toHaveAttribute("r", "4");
  expect(circles[1]).toHaveAttribute("fill", "#123456");
});

test("can disable the expanded target without disabling the visible marker", () => {
  const rendered = render(
    <svg>
      <ScatterPointHitTarget
        cx={8}
        cy={9}
        fill="#123456"
        expandedHitTarget={false}
      />
    </svg>
  );
  const circles = rendered.container.querySelectorAll("circle");

  expect(circles[0]).toHaveAttribute("pointer-events", "none");
  expect(circles[1]).not.toHaveAttribute("pointer-events", "none");
  expect(circles[1]).toHaveAttribute("fill", "#123456");
});
