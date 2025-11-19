import { bubbleStyle, selectedWrapped } from "..";

type MondayPlayer = {
  id: string;
  name: string;
  nflTeam: string;
  projection: number;
  actual: number;
};

type TeamMondayContext = {
  id: string;
  name: string;
  weekNum: string;
  sundayScore: number;
  mondayProjection: number;
  mondayActual: number;
  finalScore: number;
  preMondayExpected: number;
  mondayPlayers: MondayPlayer[];
};

type MondayShowdown = {
  weekNum: string;
  spiceScore: number;
  swing: number;
  expectedDiff: number;
  finalDiff: number;
  expectedLeader?: string;
  finalWinner?: string;
  teams: [TeamMondayContext, TeamMondayContext];
  hero?: MondayPlayer & { delta: number };
};

const MONDAY_TEAMS_BY_YEAR: Record<string, Record<string, string[]>> = {
  "2021": {
    "1": ["13", "33"],
    "2": ["8", "9"],
    "3": ["21", "6"],
    "4": ["13", "24"],
    "5": ["11", "33"],
    "6": ["10", "2"],
    "7": ["18", "26"],
    "8": ["12", "19"],
    "9": ["23", "3"],
    "10": ["14", "25"],
    "11": ["19", "27"],
    "12": ["26", "28"],
    "13": ["17", "2"],
    "14": ["14", "22"],
    "15": ["13", "14", "16", "21", "26", "28", "3", "5"],
    "16": ["15", "18"],
    "17": ["23", "5"],
  },
  "2022": {
    "1": ["26", "7"],
    "2": ["10", "16", "2", "21"],
    "3": ["19", "6"],
    "4": ["14", "25"],
    "5": ["12", "13"],
    "6": ["24", "7"],
    "7": ["17", "3"],
    "8": ["4", "5"],
    "9": ["18", "33"],
    "10": ["21", "28"],
    "11": ["22", "25"],
    "12": ["11", "23"],
    "13": ["18", "27"],
    "14": ["17", "22"],
    "15": ["14", "9"],
    "16": ["11", "24"],
  },
  "2023": {
    "1": ["2", "20"],
    "2": ["18", "23", "29", "5"],
    "3": ["14", "21", "27", "4"],
    "4": ["19", "26"],
    "5": ["13", "9"],
    "6": ["24", "6"],
    "7": ["16", "25"],
    "8": ["13", "8"],
    "9": ["20", "24"],
    "10": ["2", "7"],
    "11": ["12", "21"],
    "12": ["16", "3"],
    "13": ["30", "4"],
    "14": ["10", "15", "19", "9"],
    "15": ["21", "26"],
    "16": ["12", "13", "19", "21", "25", "33"],
  },
  "2024": {
    "1": ["20", "25"],
    "2": ["1", "21"],
    "3": ["2", "28", "30", "4"],
    "4": ["10", "15", "26", "8"],
    "5": ["12", "18"],
    "6": ["2", "20"],
    "7": ["22", "24", "27", "33"],
    "8": ["19", "23"],
    "9": ["12", "27"],
    "10": ["14", "15"],
    "11": ["34", "6"],
    "12": ["24", "33"],
    "13": ["5", "7"],
    "14": ["4", "6"],
    "15": ["1", "13", "16", "3"],
    "16": ["18", "9"],
    "17": ["12", "23", "25", "33", "34", "8"],
  },
  "2025": {
    "1": ["16", "3"],
    "2": ["13", "24", "27", "34"],
    "3": ["33", "8"],
    "4": ["15", "20", "4", "7"],
    "5": ["12", "30"],
    "6": ["1", "2", "28", "3"],
    "7": ["26", "27", "34", "8"],
    "8": ["12", "28"],
    "9": ["22", "6"],
    "10": ["21", "9"],
    "11": ["13", "6"],
    "12": ["25", "29"],
    "13": ["17", "19"],
    "14": ["21", "24"],
    "15": ["15", "23"],
    "16": ["11", "25"],
    "17": ["1", "14"],
  },
};

export default function MondayNight() {
  const wrapped = selectedWrapped();
  const showdowns = Object.entries(wrapped.ffMatchups)
    .flatMap(([weekNum, matchups]) =>
      matchups
        .map((matchup) => analyzeMatchup(weekNum, matchup))
        .filter((matchup): matchup is MondayShowdown => matchup !== undefined)
    )
    .sort((a, b) => b.spiceScore - a.spiceScore)
    .slice(0, 10);

  if (showdowns.length === 0) {
    return (
      <div style={{ ...bubbleStyle, maxWidth: 600 }}>
        We didn&apos;t find any matchups where Monday night (or Tuesday makeup)
        players had a chance to swing things this season.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {showdowns.map((showdown, index) => (
        <article
          key={`${showdown.weekNum}-${showdown.teams[0].id}-${showdown.teams[1].id}-${index}`}
          style={{
            ...bubbleStyle,
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <header style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>
                Week {showdown.weekNum}: {showdown.teams[0].name} vs {" "}
                {showdown.teams[1].name}
              </strong>
              <div style={{ fontSize: "0.85em", color: "#444" }}>
                Spice score: {showdown.spiceScore} / 999
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.9em" }}>
              <div>
                Pre-Monday:{" "}
                {formatLeadText(showdown.expectedDiff, showdown.expectedLeader)}
              </div>
              <div>
                Final:{" "}
                {formatLeadText(showdown.finalDiff, showdown.finalWinner)}
              </div>
            </div>
          </header>
          <div>
            Monday swing: {showdown.swing.toFixed(2)} pts ·
            {" "}
            {describeSwing(showdown.expectedDiff, showdown.finalDiff)}
          </div>
          {showdown.hero && (
            <div>
              {showdown.hero.delta >= 0 ? "Hero" : "Heartbreaker"}: {" "}
              <strong>{showdown.hero.name}</strong> ({showdown.hero.nflTeam})
              {" "}
              {showdown.hero.delta >= 0 ? "beat" : "fell short of"} their
              projection by {Math.abs(showdown.hero.delta).toFixed(2)} pts.
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {showdown.teams.map((team) => (
              <section
                key={team.id}
                style={{ flex: "1 1 250px", minWidth: 220 }}
              >
                <div style={{ fontWeight: 600 }}>{team.name}</div>
                <div style={{ fontSize: "0.9em", color: "#333" }}>
                  Monday starters: {team.mondayPlayers.length || "none"} ·
                  {" "}
                  {team.mondayActual.toFixed(2)} pts scored vs {" "}
                  {team.mondayProjection.toFixed(2)} projected
                </div>
                {team.mondayPlayers.length ? (
                  <ul style={{ margin: "0.4rem 0 0", paddingInlineStart: 20 }}>
                    {team.mondayPlayers.map((player) => (
                      <li key={player.id}>
                        {player.name} ({player.nflTeam}): {" "}
                        {player.actual.toFixed(2)} pts (proj. {" "}
                        {player.projection.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: "0.85em", marginTop: "0.4rem" }}>
                    Nothing left in prime time.
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function getIsMondayGame(nflTeamId: string, weekNum: string): boolean {
  const wrapped = selectedWrapped();
  const mondayMap = MONDAY_TEAMS_BY_YEAR[wrapped.year];
  if (!mondayMap) return false;
  return mondayMap[weekNum]?.includes(nflTeamId) ?? false;
}

const buildTeamMondayContext = (
  teamId: string,
  weekNum: string
): TeamMondayContext | undefined => {
  const wrapped = selectedWrapped();
  const ffTeam = wrapped.ffTeams[teamId];
  const roster = ffTeam?.rosters?.[weekNum];

  if (!ffTeam || !roster) {
    return undefined;
  }

  const totals = roster.starting.reduce(
    (acc, playerId) => {
      const player = wrapped.nflPlayers[playerId];
      if (!player) return acc;
      const playerScore = player.scores?.[weekNum] ?? 0;
      const projection = roster.projections?.[playerId] ?? 0;
      const mondayGame = getIsMondayGame(player.nflTeamId, weekNum);

      if (mondayGame) {
        acc.mondayProjection += projection;
        acc.mondayActual += playerScore;
        acc.mondayPlayers.push({
          id: playerId,
          name: player.name,
          nflTeam: wrapped.nflTeams[player.nflTeamId]?.name ?? player.nflTeamId,
          projection,
          actual: playerScore,
        });
      } else {
        acc.sundayScore += playerScore;
      }

      acc.finalScore += playerScore;
      return acc;
    },
    {
      sundayScore: 0,
      mondayProjection: 0,
      mondayActual: 0,
      finalScore: 0,
      mondayPlayers: [] as MondayPlayer[],
    }
  );

  return {
    id: teamId,
    name: ffTeam.name,
    weekNum,
    sundayScore: totals.sundayScore,
    mondayProjection: totals.mondayProjection,
    mondayActual: totals.mondayActual,
    finalScore: totals.finalScore,
    preMondayExpected: totals.sundayScore + totals.mondayProjection,
    mondayPlayers: totals.mondayPlayers,
  };
};

const analyzeMatchup = (
  weekNum: string,
  matchup: (string | null)[]
): MondayShowdown | undefined => {
  if (matchup.length !== 2 || matchup.some((teamId) => teamId === null)) {
    return undefined;
  }

  const teams = matchup.map((teamId) =>
    buildTeamMondayContext(teamId!, weekNum)
  ) as (TeamMondayContext | undefined)[];

  if (teams.some((team) => !team)) return undefined;

  const [teamA, teamB] = teams as [TeamMondayContext, TeamMondayContext];
  if (!teamA.mondayPlayers.length && !teamB.mondayPlayers.length) {
    return undefined;
  }

  const expectedDiff = teamA.preMondayExpected - teamB.preMondayExpected;
  const finalDiff = teamA.finalScore - teamB.finalScore;
  const swing = Math.abs(finalDiff - expectedDiff);
  const mondayVolume =
    teamA.mondayProjection + teamB.mondayProjection + teamA.mondayActual + teamB.mondayActual;
  const hero = [...teamA.mondayPlayers, ...teamB.mondayPlayers]
    .map((player) => ({ ...player, delta: player.actual - player.projection }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  const spiceScore = calculateSpiceScore({
    swing,
    mondayVolume,
    expectedDiff,
    finalDiff,
    heroDelta: hero?.delta,
  });

  return {
    weekNum,
    spiceScore,
    swing,
    expectedDiff,
    finalDiff,
    expectedLeader: resolveLeader(expectedDiff, teamA.name, teamB.name),
    finalWinner: resolveLeader(finalDiff, teamA.name, teamB.name),
    teams: [teamA, teamB],
    hero,
  };
};

function resolveLeader(diff: number, teamA: string, teamB: string): string | undefined {
  if (Math.abs(diff) < 1e-6) return undefined;
  return diff > 0 ? teamA : teamB;
}

function formatLeadText(diff: number, leader?: string) {
  if (!leader || Math.abs(diff) < 1e-6) {
    return "Tied";
  }
  return `${leader} by ${Math.abs(diff).toFixed(2)} pts`;
}

function describeSwing(expectedDiff: number, finalDiff: number) {
  const flipped = Math.sign(expectedDiff) !== Math.sign(finalDiff);
  if (Math.abs(expectedDiff) < 1e-6) {
    return flipped
      ? "From deadlocked to decisive"
      : "Stayed neck and neck";
  }
  return flipped ? "Lead flipped under the lights" : "Lead held (but sweated)";
}

function calculateSpiceScore({
  swing,
  mondayVolume,
  expectedDiff,
  finalDiff,
  heroDelta,
}: {
  swing: number;
  mondayVolume: number;
  expectedDiff: number;
  finalDiff: number;
  heroDelta?: number;
}): number {
  const comebackBonus = Math.sign(expectedDiff) !== Math.sign(finalDiff) ? 0.12 : 0;
  const swingIntensity = normalizeForSpice(swing, 55);
  const volumeIntensity = normalizeForSpice(mondayVolume, 140);
  const expectedTightness = 1 - Math.tanh(Math.abs(expectedDiff) / 32);
  const finishTightness = 1 - Math.tanh(Math.abs(finalDiff) / 24);
  const heroImpact = heroDelta ? normalizeForSpice(Math.abs(heroDelta), 18) : 0;

  const weightedScore =
    swingIntensity * 0.45 +
    volumeIntensity * 0.2 +
    expectedTightness * 0.15 +
    finishTightness * 0.08 +
    heroImpact * 0.08 +
    comebackBonus;

  const microAdjust =
    ((swing % 1) * 0.0005 + (mondayVolume % 1) * 0.0003 +
      (heroDelta ? (Math.abs(heroDelta) % 1) * 0.0002 : 0));

  const normalized = Math.min(0.999, Math.max(0, weightedScore + microAdjust));
  return Math.round(normalized * 1000);
}

function normalizeForSpice(value: number, pivot: number): number {
  if (value <= 0) return 0;
  return Math.min(1, Math.log1p(value) / Math.log1p(pivot));
}
