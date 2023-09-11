import { printF } from "../Fetch";
import rawWrapped from "./wrapped.json";

const wrapped: WrappedType = rawWrapped;

type WrappedType = {
  players: {
    [id: string]: {
      name: string;
      team: string;
      position: string;
      scores: { [scoringPeriodId: string]: number | undefined };
    };
  };
  managers: {
    [id: string]: {
      name: string;
      rosters: {
        starting: string[];
        bench: string[];
        fieldGoals: number[];
        pointsAllowed: number;
        yardsAllowed: number;
      }[];
    };
  };
  matchups: [number, number][][];
};

export default function Wrapped() {
  return (
    <div>
      <div>
        <input readOnly value={printF(fetchWrapped)} />
      </div>
    </div>
  );
}

function fetchWrapped() {
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
    .then((players: any[]) =>
      players
        .map((player) => ({
          id: player.id,
          name: player.fullName,
          position:
            { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 16: "DST" }[
              player.defaultPositionId as number
            ] || player.defaultPositionId,
          scores: Object.fromEntries(
            player.stats.map(
              (stat: any) =>
                [
                  stat.scoringPeriodId,
                  parseFloat(stat.appliedTotal.toFixed(2)),
                ] as [number, number]
            )
          ),
        }))
        .map((player) => ({
          total: parseFloat(
            Object.values(player.scores)
              .reduce((a, b) => a + b, 0)
              .toFixed(2)
          ),
          ...player,
        }))
        .filter(({ total }) => total > 1)
        .sort((a, b) => b.total - a.total)
    )
    .then(
      (players) => ({ players: {}, managers: {}, matchups: [] } as WrappedType)
    )
    .then(console.log);
}
