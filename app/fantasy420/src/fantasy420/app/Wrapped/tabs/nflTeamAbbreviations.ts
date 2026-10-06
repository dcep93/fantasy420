const TEAM_NAME_TO_ABBR: Record<string, string> = {
  Cardinals: "ARI",
  Falcons: "ATL",
  Ravens: "BAL",
  Bills: "BUF",
  Panthers: "CAR",
  Bears: "CHI",
  Bengals: "CIN",
  Browns: "CLE",
  Cowboys: "DAL",
  Broncos: "DEN",
  Lions: "DET",
  Packers: "GB",
  Texans: "HOU",
  Colts: "IND",
  Jaguars: "JAX",
  Chiefs: "KC",
  Raiders: "LV",
  Chargers: "LAC",
  Rams: "LAR",
  Dolphins: "MIA",
  Vikings: "MIN",
  Patriots: "NE",
  Saints: "NO",
  Giants: "NYG",
  Jets: "NYJ",
  Eagles: "PHI",
  Steelers: "PIT",
  "49ers": "SF",
  Seahawks: "SEA",
  Buccaneers: "TB",
  Titans: "TEN",
  Commanders: "WSH",
};

const TEAM_ABBR_TO_NAMES = Object.entries(TEAM_NAME_TO_ABBR).reduce(
  (acc, [name, abbr]) => {
    if (!acc[abbr]) acc[abbr] = [];
    acc[abbr]!.push(name);
    return acc;
  },
  {} as Record<string, string[]>
);

export function lookupTeamAbbreviation(teamName?: string | null): string | null {
  if (!teamName) return null;
  const trimmed = teamName.trim();
  return TEAM_NAME_TO_ABBR[trimmed] ??
    (TEAM_ABBR_TO_NAMES[trimmed.toUpperCase()] ? trimmed.toUpperCase() : null);
}
