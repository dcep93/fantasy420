import { draft_json, qbToNonQB } from "../Draft";
import { fetched_draft_day } from "../Fetch";

export default function Schedule() {
  const auctionValues = Object.fromEntries(
    Object.keys(draft_json.espn.auction).map((name) => [
      name,
      draft_json.espn.auction[qbToNonQB[name] || name],
    ])
  );
  return (
    <div>
      {fetched_draft_day.teams.map((team, i) => {
        const teamPlayers = team.players.map((player) => ({
          ...player,
          auctionValue: auctionValues[player.name] || 0,
        }));
        const teamWeeks = fetched_draft_day.matchups
          .map((matches, j) => ({
            number: j + 1,
            opponent: fetched_draft_day.teams.find(
              (opponent) =>
                team.id !== opponent.id &&
                matches.find(
                  (match) =>
                    match.includes(team.id) && match.includes(opponent.id)
                )!
            )!,
          }))
          .map((o) => ({
            myByes: team.players
              .filter((player) => player.bye === o.number)
              .map((player) => ({
                ...player,
                auctionValue: auctionValues[player.name] || 0,
              })),
            byes: o.opponent.players
              .filter((player) => player.bye === o.number)
              .map((player) => ({
                ...player,
                auctionValue: auctionValues[player.name] || 0,
              })),
            ...o,
          }));
        return (
          <div
            key={i}
            style={{
              border: "2px solid black",
              borderRadius: "20px",
              margin: "20px",
              padding: "20px",
            }}
          >
            <div
              title={teamPlayers
                .map(
                  (player) =>
                    `${player.name} $${player.auctionValue} / bye ${player.bye}`
                )
                .join("\n")}
            >
              <div>team: {team.name}</div>
              <div>
                owned: $
                {teamPlayers
                  .map((player) => player.auctionValue)
                  .reduce((a, b) => a + b, 0)
                  .toFixed(1)}
              </div>
              <div>
                byes: $
                {teamWeeks
                  .flatMap((week) =>
                    week.byes.map((player) => player.auctionValue)
                  )
                  .reduce((a, b) => a + b, 0)
                  .toFixed(1)}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
              }}
            >
              {teamWeeks.map((week, j) => (
                <div
                  key={j}
                  style={{
                    border: "2px solid black",
                    borderRadius: "20px",
                    padding: "10px",
                    margin: "10px",
                  }}
                  title={week.myByes
                    .map((player) => `${player.name} $${player.auctionValue}`)
                    .join("\n")}
                >
                  <h2>
                    week {week.number} vs {week.opponent.name}: $
                    {week.byes
                      .map((player) => player.auctionValue || 0)
                      .reduce((a, b) => a + b, 0)
                      .toFixed(1)}{" "}
                    - $
                    {week.myByes
                      .map((player) => player.auctionValue)
                      .reduce((a, b) => a + b, 0)
                      .toFixed(1)}
                  </h2>
                  {week.byes.map((player, k) => (
                    <div key={k} title={qbToNonQB[player.name]}>
                      {player.name} ${player.auctionValue}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
