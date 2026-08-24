export const NIGHT_COLORS = {
  page: "#0b0f14",
  surface: "#151b23",
  surfaceAlt: "#1d2631",
  text: "#f4f7fb",
  mutedText: "#aeb8c5",
  border: "#3b4756",
  link: "#79c0ff",
  focus: "#ff7bc3",
  input: "#101720",
  chartCanvas: "#10161e",
  chartGrid: "#334155",
  tooltip: "#1b2430",
  positionText: "#111827",
  win: "#69db7c",
  loss: "#ff7b86",
} as const;

export const NIGHT_CHART_COLORS = [
  "#ff6b6b",
  "#69db7c",
  "#4dabf7",
  "#ffd43b",
  "#66d9e8",
  "#f783ac",
  "#ffa94d",
  "#b197fc",
  "#a9e34b",
  "#e599f7",
] as const;

function relativeLuminance(hex: string): number {
  const channels = hex
    .match(/[\da-f]{2}/gi)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4)
    );
  return (
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  );
}

export function contrastRatio(left: string, right: string): number {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05)
  );
}
