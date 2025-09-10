import { groupByF } from "..";
import { playerStatsData } from "./PlayerStats";

export default function PositionTrends() {
  return (
    <pre>
      {JSON.stringify(
        Object.entries(
          groupByF(
            playerStatsData.flatMap((p) => p.years.map((y) => ({ p, y }))),
            (o) => o.y.year.toString()
          )
        )
          .map(([year, yearPlayers]) => ({
            year: parseInt(year),
            positions: Object.entries(
              groupByF(yearPlayers, (p) => p.p.position)
            ).map(([position, positionPlayers]) => ({
              position,
              x: Object.entries(
                groupByF(
                  positionPlayers
                    .map(
                      (p) => p.p.years.find((y) => y.year === p.y.year)!.scores
                    )
                    .flatMap((scores) =>
                      scores.map((s, wMinusOne) => ({ s, w: wMinusOne + 1 }))
                    ),
                  (y) => y.w.toString()
                )
              )
                .map(([w, scores]) => ({
                  w,
                  scores: scores.map(({ s }) => s!).filter(Boolean),
                }))
                .map((o) => ({
                  w: parseInt(o.w),
                  avg: o.scores.reduce((a, b) => a + b, 0) / o.scores.length,
                }))
                .sort((a, b) => a.w - b.w),
            })),
          }))
          .sort((a, b) => b.year - a.year)
          .filter(({ year }) => year !== 2025),
        null,
        2
      ).slice(0, 10000)}
    </pre>
  );
}
