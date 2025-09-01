import { bubbleStyle, Helpers, selectedWrapped } from "..";

export default function OwnedTeams() {
  const byNFLTeam = Object.fromEntries(
    Object.values(selectedWrapped().nflTeams)
      .map((nflTeam) => ({
        owned: Object.values(selectedWrapped().ffTeams).flatMap((ffTeam) =>
          ffTeam.rosters["0"].rostered
            .map((playerId) => selectedWrapped().nflPlayers[playerId])
            .filter((p) => p?.nflTeamId === nflTeam.id)
            .map((nflPlayer) => ({ ffTeam, nflPlayer }))
        ),
        nflTeam,
      }))
      .map((o) => [o.nflTeam.id, o])
  );
  const byFFTeam = Object.values(selectedWrapped().ffTeams).map((ffTeam) => ({
    owned: Object.values(selectedWrapped().nflTeams).flatMap((nflTeam) =>
      ffTeam.rosters["0"].rostered
        .map((playerId) => selectedWrapped().nflPlayers[playerId])
        .filter((p) => p?.nflTeamId === nflTeam.id)
        .map((nflPlayer) => ({ ffTeam, nflPlayer }))
    ),
    ...ffTeam,
  }));
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {byFFTeam.map((ffTeam) => (
          <div key={ffTeam.id}>
            <div style={bubbleStyle}>
              <h2>{ffTeam.name}</h2>
              {Object.entries(
                Helpers.countStrings(
                  ffTeam.owned.map((o) => o.nflPlayer.nflTeamId)
                )
              )
                .map(([nflTeamId, c]) => ({ nflTeamId, c }))
                .sort((a, b) => b.c - a.c)
                .map((o) => (
                  <div
                    key={o.nflTeamId}
                    title={ffTeam.owned
                      .filter((oo) => oo.nflPlayer.nflTeamId === o.nflTeamId)
                      .map((oo) => oo.nflPlayer.name)
                      .join("\n")}
                  >
                    {selectedWrapped().nflTeams[o.nflTeamId].name}: {o.c}/
                    {byNFLTeam[o.nflTeamId].owned.length}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div style={bubbleStyle}></div>
      <div>
        {Object.values(byNFLTeam)
          .sort((a, b) => a.owned.length - b.owned.length)
          .reverse()
          .map((t) => (
            <div key={t.nflTeam.id} style={bubbleStyle}>
              <h1>
                {t.nflTeam.name} {t.owned.length}
              </h1>
              <div>
                {t.owned
                  .sort((a, b) => b.nflPlayer.total - a.nflPlayer.total)
                  .map((o, i) => (
                    <div key={i}>
                      {Helpers.toFixed(o.nflPlayer.total)} {o.ffTeam.name}:{" "}
                      {o.nflPlayer.name}
                    </div>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
