import { ReactNode, SVGProps } from "react";

export const CHART_POINT_HIT_RADIUS = 22;

export function ChartPointHitTarget(
  props: {
    children?: ReactNode;
    cx?: number;
    cy?: number;
  } & Omit<SVGProps<SVGGElement>, "children">
) {
  const { children, cx, cy, ...groupProps } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;

  return (
    <g {...groupProps}>
      <circle
        data-chart-point-hit-target="true"
        cx={cx}
        cy={cy}
        r={CHART_POINT_HIT_RADIUS}
        fill="transparent"
        stroke="transparent"
        pointerEvents="all"
        aria-hidden="true"
        focusable="false"
      />
      {children}
    </g>
  );
}

export function ScatterPointHitTarget(props: {
  cx?: number;
  cy?: number;
  fill?: string;
}) {
  const { cx, cy, fill = "#8884d8" } = props;
  if (typeof cx !== "number" || typeof cy !== "number") return null;

  return (
    <ChartPointHitTarget cx={cx} cy={cy}>
      <circle cx={cx} cy={cy} r={4} fill={fill} />
    </ChartPointHitTarget>
  );
}
