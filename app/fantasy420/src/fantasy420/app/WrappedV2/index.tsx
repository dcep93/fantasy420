import { printF } from "../Fetch";
import rawWrappedV2 from "./wrapped_v2.json";

const wrappedV2: WrappedV2Type = rawWrappedV2;

type WrappedV2Type = {
  total: number;
  name: string;
  position: string;
  scores: { [scoringPeriodId: string]: number | undefined };
}[];

export default function WrappedV2() {
  return (
    <div>
      <div>
        <input readOnly value={printF(fetchWrappedV2)} />
      </div>
      <div>
        <pre>
          {JSON.stringify(
            wrappedV2.find((player) => player.name === "Justin Jefferson"),
            null,
            2
          )}
        </pre>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {Array.from(new Array(18))
            .map((_, weekNum) => ({
              weekNum,
              players: wrappedV2
                .map((player) => ({
                  score: weekNum === 0 ? player.total : player.scores[weekNum],
                  ...player,
                }))
                .map((player) => ({
                  sortableScore: player.score || 0,
                  ...player,
                }))
                .sort((a, b) => b.sortableScore - a.sortableScore)
                .slice(0, 10),
            }))
            .map((week) => (
              <div
                key={week.weekNum}
                style={{
                  border: "2px solid black",
                  borderRadius: "10px",
                  padding: "10px",
                  margin: "10px",
                }}
              >
                <h3>{week.weekNum ? `week ${week.weekNum}` : "total"}</h3>
                {week.players.map((player) => (
                  <div key={player.name}>
                    {player.name}: {player.score}
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function fetchWrappedV2() {
  return fetch(
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/203836968?view=kona_playercard",
    {
      headers: {
        accept: "application/json",
        "x-fantasy-filter": JSON.stringify({
          players: {
            filterSlotIds: { value: [0, 7, 2, 23, 4, 6] },
            sortAppliedStatTotal: {
              sortAsc: false,
              sortPriority: 2,
              value: "002022",
            },
            sortAppliedStatTotalForScoringPeriodId: null,
            sortStatId: null,
            sortStatIdForScoringPeriodId: null,
            sortPercOwned: { sortPriority: 3, sortAsc: false },
            filterRanksForSlotIds: { value: [0, 2, 4, 6, 17, 16] },
            filterStatsForTopScoringPeriodIds: {
              value: 17,
            },
          },
        }),
        "x-fantasy-platform":
          "kona-PROD-5b4759b3e340d25d9e1ae248daac086ea7c37db7",
        "x-fantasy-source": "kona",
      },
      credentials: "include",
    }
  )
    .then((resp) => resp.json())
    .then((resp) => resp.players.map((player: any) => player.player))
    .then(
      (players: any[]) =>
        players
          .map((player) => ({
            name: player.fullName,
            position:
              ["", "QB", "RB", "WR", "TE"][player.defaultPositionId] ||
              player.defaultPositionId,
            scores: Object.fromEntries(
              player.stats.map(
                (stat: any) =>
                  [
                    stat.scoringPeriodId,
                    parseInt(stat.appliedTotal.toFixed(2)),
                  ] as [number, number]
              )
            ),
          }))
          .map((player) => ({
            total: Object.values(player.scores).reduce((a, b) => a + b, 0),
            ...player,
          }))
          .filter(({ total }) => total > 1)
          .sort((a, b) => b.total - a.total) as WrappedV2Type
    )
    .then(console.log);
}
