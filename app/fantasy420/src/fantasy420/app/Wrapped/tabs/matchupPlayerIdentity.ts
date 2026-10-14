import type { SeasonGame } from "./spiciestMatchupsData";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’'‘.-]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function identity(name: string): string {
  return normalize(name).replace(/\s+(?:jr|sr|ii|iii|iv|v)$/, "");
}

function abbreviation(name: string): string {
  const parts = name.split(" ");
  return parts.length > 1 ? parts[0][0] + parts.slice(1).join("") : name;
}

export function gamePlayerNames(game: SeasonGame): string[] {
  return [...new Set(game.teams.flatMap(team => (team.boxScore ?? [])
    .flatMap(category => category.players.map(player => identity(player.name)))))];
}

/** Weekly participation wins over a saved team that may reflect a later trade. */
export function findPlayerGame(name: string, games: SeasonGame[], fallback?: SeasonGame): SeasonGame | undefined {
  const full = identity(name);
  const exact = games.filter(game => gamePlayerNames(game).includes(full));
  if (exact.length) return exact.length === 1 ? exact[0] : undefined;
  return fallback;
}

export function playerPlayMatcher(name: string, game?: SeasonGame): (text: string) => boolean {
  const full = identity(name);
  const short = abbreviation(full);
  const names = game ? gamePlayerNames(game) : [];
  const candidates = names.filter(other => abbreviation(other) === short);
  const allowShort = candidates.length === 0 || (candidates.length === 1 && candidates[0] === full);
  // Boundaries prevent K.Allen from matching J.Allen or an unrelated Allen.
  return text => {
    const normalized = ` ${normalize(text)} `;
    if (normalized.includes(` ${full} `)) return true;
    if (!allowShort || !short || !full.includes(" ")) return false;
    const parts = full.split(" ");
    return (parts[0].length <= 2 && normalized.includes(` ${parts.join("")} `)) ||
      normalized.includes(` ${short} `) ||
      normalized.includes(` ${parts[0][0]} ${parts.slice(1).join(" ")} `);
  };
}
