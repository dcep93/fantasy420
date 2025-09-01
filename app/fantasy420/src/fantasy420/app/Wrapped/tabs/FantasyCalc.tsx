import { bubbleStyle, selectedWrapped, selectedYear } from "..";
import allWrapped from "../allWrapped";

export default function FantasyCalc() {
  const playerIdToDraftIndex = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams)
      .flatMap((team) => team.draft)
      .map((p) => [selectedWrapped().nflPlayers[p.playerId].id, p.pickIndex])
  );
  const owned = Object.fromEntries(
    Object.values(selectedWrapped().ffTeams)
      .flatMap((p) => p.rosters["0"].rostered)
      .map((playerId) => [playerId, true])
  );
  const fantasyCalcPlayers: { [playerId: string]: number } = Object.fromEntries(
    Object.entries(selectedWrapped().fantasyCalc.players).map(
      ([playerId, value]) => [
        !isNaN(parseInt(playerId))
          ? playerId
          : Object.values(selectedWrapped().nflPlayers).find(
              (p) => p.name === playerId
            )?.id || playerId,
        value,
      ]
    )
  );
  return (
    <div>
      <div>https://fantasycalc.com/redraft-rankings</div>
      <div>{new Date(selectedWrapped().fantasyCalc.timestamp).toString()}</div>
      <div style={bubbleStyle}>
        <h1>UNOWNED</h1>
        <div>
          {Object.entries(fantasyCalcPlayers)
            .map(([playerId, value]) => ({
              playerId,
              value,
            }))
            .filter(({ playerId }) => !owned[playerId])
            .sort((a, b) => b.value - a.value)
            .slice(0, 20)
            .map((f) => ({
              ...f,
              name:
                allWrapped[selectedYear].nflPlayers[f.playerId]?.name ||
                f.playerId,
            }))
            .map((f) => (
              <div key={f.playerId}>
                {f.value.toFixed(2)} {f.name}
              </div>
            ))}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", whiteSpace: "nowrap" }}>
        {Object.values(selectedWrapped().ffTeams)
          .map(({ rosters, ...t }) => ({
            ...t,
            ps: rosters["0"].rostered
              .map((playerId) => selectedWrapped().nflPlayers[playerId])
              .map((p) => ({
                ...p,
                name: p?.name || "missing",
                value: fantasyCalcPlayers[p?.id] || 0,
                draftPick: playerIdToDraftIndex[p?.id],
              }))
              .sort((a, b) => b.value - a.value),
          }))
          .map((t) => ({
            ...t,
            value: t.ps.map((p) => p.value).reduce((a, b) => a + b, 0),
          }))
          .sort((a, b) => b.value - a.value)
          .map((t) => (
            <div key={t.id} style={bubbleStyle}>
              <h2>{t.name}</h2>
              <h3
                title={JSON.stringify(
                  t.ps
                    .filter((p) =>
                      selectedWrapped().ffTeams[t.id].draft.find(
                        (pp) => pp.playerId.toString() === p.id
                      )
                    )
                    .map((p) => p.name),
                  null,
                  2
                )}
              >
                {(
                  (100 *
                    t.ps.filter((p) =>
                      selectedWrapped().ffTeams[t.id].draft.find(
                        (pp) => pp.playerId.toString() === p.id
                      )
                    ).length) /
                  t.ps.length
                ).toFixed(2)}
                % self-drafted
              </h3>
              <h3
                title={JSON.stringify(
                  t.ps.filter((p) => !isNaN(p.draftPick)).map((p) => p.name),
                  null,
                  2
                )}
              >
                {(
                  (100 * t.ps.filter((p) => !isNaN(p.draftPick)).length) /
                  t.ps.length
                ).toFixed(2)}
                % drafted
              </h3>
              <h3>{t.value.toFixed(2)}</h3>
              {t.ps.map((p, i) => (
                <div key={i}>
                  {p.value.toFixed(2)} {p.name} ({p.draftPick + 1})
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
