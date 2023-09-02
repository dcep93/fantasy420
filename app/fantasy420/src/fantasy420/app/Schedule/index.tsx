import { DraftJsonType, normalize } from "../Draft";
import draftJson from "../Draft/draft.json";
import { FetchedType } from "../Fetch";
import rawFetched from "../Fetch/fetched.json";

var lastValue = 1000;
const auctionValues = Object.fromEntries(
  Object.entries((draftJson as DraftJsonType).espn.auction)
    .map(([name, value]) => ({
      name,
      value,
      draftSharksSuperValue:
        (draftJson as DraftJsonType).extra["draftsharks_super"][
          normalize(name)
        ] || Infinity,
    }))
    .sort((a, b) => b.draftSharksSuperValue - a.draftSharksSuperValue)
    .map(({ name, value }) => {
      if ((draftJson as DraftJsonType).espn.players[name]?.position === "QB") {
        value = lastValue;
      } else {
        lastValue = value;
      }
      return { name, value };
    })
    .map(({ name, value }) => [name, value])
);

export default function Schedule() {
  const fetched: FetchedType = rawFetched;
  return (
    <div>
      {fetched.teams.map((team, i) => {
        const teamPlayers = team.players.map((player) => ({
          ...player,
          auctionValue: auctionValues[player.name] || 0,
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
