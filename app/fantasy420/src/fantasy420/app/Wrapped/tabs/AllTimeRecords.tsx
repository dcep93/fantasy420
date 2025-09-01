import { bubbleStyle } from "..";
import { WrappedType } from "../../FetchWrapped";
import allWrapped from "../allWrapped";

export default function AllTimeRecords() {
  return (
    <div>
      {Object.entries({
        // interceptions: (year, wrapped) =>
        //   Object.values(wrapped.nflTeams).flatMap((t) =>
        //     Object.entries(t.nflGamesByScoringPeriod).map(([weekNum, obj]) => ({
        //       year,
        //       weekNum,
        //       name: t.name,
        //       value: (obj?.drives || []).filter(
        //         (drive) => drive?.toLowerCase() === "interception"
        //       ).length,
        //     }))
        //   ),
        // fumbles: (year, wrapped) =>
        //   Object.values(wrapped.nflTeams).flatMap((t) =>
        //     Object.entries(t.nflGamesByScoringPeriod).map(([weekNum, obj]) => ({
        //       year,
        //       weekNum,
        //       name: t.name,
        //       value: (obj?.drives || []).filter(
        //         (drive) => drive?.toLowerCase() === "fumble"
        //       ).length,
        //     }))
        //   ),
        manager_score: (year, wrapped) =>
          Object.values(wrapped.ffTeams).flatMap((t) =>
            Object.values(t.rosters)
              .map(({ weekNum, starting }) => ({
                year,
                weekNum,
                name: t.name,
                value: starting
                  .map(
                    (playerId) =>
                      wrapped.nflPlayers[playerId].scores[weekNum] || 0
                  )
                  .reduce((a, b) => a + b, 0),
              }))
              .filter(({ value }) => value !== 0)
          ),
        started_player_season_score: (year, wrapped) =>
          Object.values(wrapped.nflPlayers)
            .filter((p) =>
              Object.values(wrapped.ffTeams)
                .flatMap((t) =>
                  Object.values(t.rosters).flatMap((r) => r.starting)
                )
                .includes(p.id)
            )
            .map((p) => ({
              year,
              weekNum: "0",
              name: p.name,
              value: p.scores["0"],
            })),
        player_week_score: (year, wrapped) =>
          Object.values(wrapped.nflPlayers)
            .filter((p) => p.position !== "DST")
            .flatMap((p) =>
              Object.entries(p.scores)
                .map(([weekNum, score]) => ({
                  year,
                  weekNum,
                  name: p.name,
                  value: score,
                }))
                .filter(({ weekNum }) => weekNum !== "0")
            ),
        dst_week_score: (year, wrapped) =>
          Object.values(wrapped.nflPlayers)
            .filter((p) => p.position === "DST")
            .flatMap((p) =>
              Object.entries(p.scores)
                .map(([weekNum, score]) => ({
                  year,
                  weekNum,
                  name: p.name,
                  value: score,
                }))
                .filter(({ weekNum }) => weekNum !== "0")
            ),
      } as {
        [recordName: string]: (
          year: string,
          wrapped: WrappedType
        ) => { year: string; weekNum: string; name: string; value: number }[];
      })
        .map(([recordName, f]) => ({
          recordName,
          sorted: Object.entries(allWrapped)
            .flatMap(([year, yearWrapped]) => f(year, yearWrapped))
            .sort((a, b) => b.value - a.value)
            .map((o, i) => ({ ...o, i })),
        }))
        .map(({ recordName, sorted }) => (
          <div key={recordName} style={bubbleStyle}>
            <h1>{recordName}</h1>
            <table>
              <tbody>
                {[sorted.slice(0, 20), [null], sorted.slice(-20)]
                  .flatMap((s) => s)
                  .map((o, i) => (
                    <tr key={i}>
                      {o === null ? (
                        <td>----</td>
                      ) : (
                        <>
                          <td>#{o.i + 1}</td>
                          <td style={{ padding: "0 30px" }}>
                            {o.year} w{o.weekNum}
                          </td>
                          <td style={{ padding: "0 30px" }}>
                            {o.value.toFixed(2)}
                          </td>
                          <td>{o.name}</td>
                        </>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
