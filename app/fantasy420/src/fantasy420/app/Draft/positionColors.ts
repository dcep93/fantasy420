export const POSITION_COLORS: { [position: string]: string } = {
  QB: "plum",
  RB: "lightblue",
  WR: "lightseagreen",
  TE: "lightcoral",
  K: "tan",
  DST: "lightsalmon",
  "D/ST": "lightsalmon",
};

export function getPositionColor(position: string): string | undefined {
  return POSITION_COLORS[position];
}
