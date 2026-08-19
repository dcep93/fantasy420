export type PlayerStatsSeason = {
  year: number;
  scores: (number | null)[];
  total: number;
};

export type PlayerStatsRecord = {
  position: string;
  total: number;
  name: string;
  years: PlayerStatsSeason[];
};

export type WrappedSeasonSnapshot = {
  year: string;
  latestScoringPeriod?: number;
  nflPlayers: Record<
    string,
    {
      name: string;
      position: string;
      total: number;
      scores: Record<string, number>;
    }
  >;
};

type RefreshOptions = {
  expectedYear?: number;
  weeks?: number;
};

const DEFAULT_EXPECTED_YEAR = 2025;
const DEFAULT_WEEKS = 18;

export function refreshCompletedSeason(
  snapshot: PlayerStatsRecord[],
  wrapped: WrappedSeasonSnapshot,
  options: RefreshOptions = {}
): PlayerStatsRecord[] {
  const expectedYear = options.expectedYear ?? DEFAULT_EXPECTED_YEAR;
  const weeks = options.weeks ?? DEFAULT_WEEKS;

  validateInputs(snapshot, wrapped, expectedYear, weeks);

  const completedPlayers = Object.values(wrapped.nflPlayers)
    .filter((player) => player.total !== 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const completedByName = new Map(
    completedPlayers.map((player) => [player.name, player])
  );
  const existingNames = new Set(snapshot.map((player) => player.name));

  const refreshed = snapshot
    .map((player) => {
      const completed = completedByName.get(player.name);
      const years = player.years
        .filter((year) => year.year !== expectedYear)
        .map(cloneSeason);

      if (completed) {
        years.push(toPlayerStatsSeason(completed, expectedYear, weeks));
      }

      years.sort((a, b) => a.year - b.year);
      if (years.length === 0) return null;

      return {
        ...player,
        position: completed?.position ?? player.position,
        years,
        total: sumTotals(years),
      };
    })
    .filter((player): player is PlayerStatsRecord => player !== null);

  const additions = completedPlayers
    .filter((player) => !existingNames.has(player.name))
    .map((player) => {
      const season = toPlayerStatsSeason(player, expectedYear, weeks);
      return {
        position: player.position,
        total: season.total,
        name: player.name,
        years: [season],
      };
    });

  return refreshed.concat(additions);
}

function validateInputs(
  snapshot: PlayerStatsRecord[],
  wrapped: WrappedSeasonSnapshot,
  expectedYear: number,
  weeks: number
) {
  if (Number(wrapped.year) !== expectedYear) {
    throw new Error(
      `Expected wrapped season ${expectedYear}, received ${wrapped.year}`
    );
  }
  if (wrapped.latestScoringPeriod !== weeks) {
    throw new Error(
      `Expected ${weeks} completed scoring periods, received ${wrapped.latestScoringPeriod}`
    );
  }

  assertUniqueNames(
    snapshot.map((player) => player.name),
    "snapshot"
  );

  const wrappedPlayers = Object.values(wrapped.nflPlayers);
  assertUniqueNames(
    wrappedPlayers.map((player) => player.name),
    "wrapped season"
  );

  snapshot.forEach((player) => {
    assertFiniteNumber(player.total, `${player.name} career total`);
    assertUniqueYears(player);
    player.years.forEach((season) => {
      assertFiniteNumber(
        season.total,
        `${player.name} ${season.year} season total`
      );
      season.scores.forEach((score, index) => {
        if (score !== null) {
          assertFiniteNumber(score, `${player.name} week ${index + 1} score`);
        }
      });
    });
  });

  wrappedPlayers.forEach((player) => {
    assertFiniteNumber(player.total, `${player.name} season total`);
    Object.entries(player.scores).forEach(([week, score]) => {
      assertFiniteNumber(score, `${player.name} week ${week} score`);
    });
  });
}

function assertUniqueNames(names: string[], source: string) {
  const seen = new Set<string>();
  names.forEach((name) => {
    if (seen.has(name)) {
      throw new Error(`Duplicate player name in ${source}: ${name}`);
    }
    seen.add(name);
  });
}

function assertUniqueYears(player: PlayerStatsRecord) {
  const seen = new Set<number>();
  player.years.forEach(({ year }) => {
    if (seen.has(year)) {
      throw new Error(`Duplicate season for ${player.name}: ${year}`);
    }
    seen.add(year);
  });
}

function assertFiniteNumber(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`Expected a finite number for ${label}`);
  }
}

function toPlayerStatsSeason(
  player: WrappedSeasonSnapshot["nflPlayers"][string],
  year: number,
  weeks: number
): PlayerStatsSeason {
  return {
    year,
    scores: Array.from({ length: weeks }, (_, index) => {
      const week = String(index + 1);
      return Object.prototype.hasOwnProperty.call(player.scores, week)
        ? player.scores[week]
        : null;
    }),
    total: player.total,
  };
}

function cloneSeason(season: PlayerStatsSeason): PlayerStatsSeason {
  return {
    ...season,
    scores: season.scores.slice(),
  };
}

function sumTotals(years: PlayerStatsSeason[]) {
  return Number(
    years.reduce((sum, season) => sum + season.total, 0).toFixed(2)
  );
}
