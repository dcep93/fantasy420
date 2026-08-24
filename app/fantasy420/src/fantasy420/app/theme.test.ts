import { POSITION_COLORS } from "./Draft/positionColors";
import {
  contrastRatio,
  NIGHT_CHART_COLORS,
  NIGHT_COLORS,
} from "./theme";

test("night theme text colors meet normal-text contrast", () => {
  expect(contrastRatio(NIGHT_COLORS.text, NIGHT_COLORS.page)).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(NIGHT_COLORS.mutedText, NIGHT_COLORS.page)
  ).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(NIGHT_COLORS.link, NIGHT_COLORS.page)).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(NIGHT_COLORS.text, NIGHT_COLORS.surface)
  ).toBeGreaterThanOrEqual(4.5);
});

test("every chart series remains visible on the night canvas", () => {
  NIGHT_CHART_COLORS.forEach((color) => {
    expect(
      contrastRatio(color, NIGHT_COLORS.chartCanvas),
      color
    ).toBeGreaterThanOrEqual(3);
  });
});

test("position fills retain readable foreground text", () => {
  const namedPositionColors: Record<string, string> = {
    plum: "#dda0dd",
    lightblue: "#add8e6",
    lightseagreen: "#20b2aa",
    lightcoral: "#f08080",
    tan: "#d2b48c",
    lightsalmon: "#ffa07a",
  };
  Array.from(new Set(Object.values(POSITION_COLORS))).forEach((color) => {
    expect(
      contrastRatio(
        NIGHT_COLORS.positionText,
        namedPositionColors[color] ?? color
      ),
      color
    ).toBeGreaterThanOrEqual(4.5);
  });
});
