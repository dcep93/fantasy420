import { draft_json, qbToNonQB } from "../Draft";
import { fetched } from "../Fetch";

export default function Schedule() {
  const auctionValues = Object.fromEntries(
    Object.keys(draft_json.espn.auction).map((name) => [
      name,
      draft_json.espn.auction[qbToNonQB[name] || name],
    ])
  );
  return (
    <div>
      {fetched.teams.map((team, i) => {
        const teamPlayers = team.players.map((player) => ({
          ...player,
          auctionValue: auctionValues[player.name],
        }));
        const teamWeeks = fetched.matchups
          .map((matches, j) => ({
            number: j + 1,
            opponent: fetched.teams.find(
              (opponent) =>
                team.id !== opponent.id &&
                matches.find(
                  (match) =>
                    match.includes(team.id) && match.includes(opponent.id)
                )!
            )!,
          }))
          .map((o) => ({
            byes: o.opponent.players
              .filter((player) => player.bye === o.number)
              .map((player) => ({
                ...player,
                auctionValue: auctionValues[player.name],
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
            <div>{team.name}</div>
            <div
              title={teamPlayers
                .map(
                  (player) =>
                    `${player.name} $${player.auctionValue} / bye ${player.bye}`
                )
                .join("\n")}
            >
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
                >
                  <h2>
                    week {week.number} vs {week.opponent.name}: $
                    {week.byes
                      .map((player) => player.auctionValue)
                      .reduce((a, b) => a + b, 0)
                      .toFixed(1)}
                  </h2>
                  {week.byes.map((player, k) => (
                    <div key={k}>
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
