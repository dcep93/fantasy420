import { Helpers, selectedWrapped } from "..";
import { selectedDraft } from "../../Draft";

export default function ByeSchedule() {
  var value = Math.max(...Object.values(selectedDraft().espn.auction));
  const auctionValues = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams)
      .flatMap((team) => team.draft)
      .sort((a, b) => b.pickIndex - a.pickIndex)
      .map(({ playerId }) => selectedWrapped().nflPlayers[playerId])
      .map((player) => {
        if (player.position !== "QB") {
          value =
            selectedWrapped().nflPlayers[player.id].ownership
              .averageDraftPosition;
        }
        return [player.id, value];
      })
  );
  const byTeam = Object.values(selectedWrapped().ffTeams).map((team) => ({
    ...team,
    matchups: Object.entries(selectedWrapped().ffMatchups)
      .map(([weekNum, matchups]) => ({
        weekNum,
        teamIds: matchups
          .find((m) => m.includes(team.id))!
          .slice()
          .sort((a, b) => (a !== team.id ? -1 : 1)),
      }))
      .map((obj) => ({
        ...obj,
        byes: obj.teamIds
          .filter((teamId) => teamId !== null)
          .map((teamId) => selectedWrapped().ffTeams[teamId!].rosters)
          .map((rosters) => rosters[obj.weekNum] || rosters["0"])
          .map((weekRoster) =>
            weekRoster.rostered.map(
              (playerId) => selectedWrapped().nflPlayers[playerId]
            )
          )
          .map((byePlayers, ffTeamIndex) =>
            byePlayers
              .filter(
                (byePlayer) =>
                  selectedWrapped().nflTeams[byePlayer.nflTeamId].byeWeek ===
                  parseInt(obj.weekNum)
              )
              .map((byePlayer) => ({
                name: byePlayer.name,
                rawValue: auctionValues[byePlayer.name] || 0,
              }))
              .sort((a, b) => b.rawValue - a.rawValue)
              .map(({ rawValue, ...obj }) => ({
                ...obj,
                value: rawValue * (ffTeamIndex === 0 ? -1 : 1),
              }))
          ),
      })),
  }));
  return (
    <div>
      {byTeam.map((team) => (
        <div
          key={team.id}
          style={{
            border: "2px solid black",
            borderRadius: "20px",
            margin: "20px",
            padding: "20px",
          }}
        >
          <div>team: {team.name}</div>
          <div>
            owned:{" "}
            {Helpers.toFixed(
              team.matchups
                .flatMap((matchup) =>
                  matchup.byes[0].map((byePlayer) => byePlayer.value)
                )
                .reduce((a, b) => a + b)
            )}
          </div>
          <div>
            opponent byes:{" "}
            {Helpers.toFixed(
              team.matchups
                .flatMap((matchup) =>
                  matchup.byes[1].map((byePlayer) => byePlayer.value)
                )
                .reduce((a, b) => a + b)
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            {team.matchups.map((obj) => (
              <div
                key={obj.weekNum}
                style={{
                  border: "2px solid black",
                  borderRadius: "20px",
                  padding: "10px",
                  margin: "10px",
                }}
              >
                <h3>
                  week {obj.weekNum} vs{" "}
                  {selectedWrapped().ffTeams[obj.teamIds[0]!].name}
                </h3>
                {obj.byes.flatMap((ffTeam) =>
                  ffTeam.map((byePlayer) => (
                    <div key={byePlayer.name}>
                      {byePlayer.name} {byePlayer.value}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
