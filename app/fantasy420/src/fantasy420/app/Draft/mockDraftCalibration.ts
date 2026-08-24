import { WrappedType } from "../FetchWrapped";
import wrapped2024Json from "../Wrapped/dataJson/2024.json";
import wrapped2025Json from "../Wrapped/dataJson/2025.json";
import draft2024Json from "./2024.json";
import draft2025Json from "./2025.json";
import getFormatAwareRankings, { RankingSources } from "./composite";
import {
  getMockDraftChoiceFeatures,
  isMockDraftPlayerEligible,
  MockDraftPlayer,
  RosterSettings,
} from "./mockDraft";
import { normalizeDraftPlayerName } from "./rookies";

type FeatureVector = [rankIndex: number, saturation: number, byeMatches: number];

export type CalibrationObservation = {
  year: string;
  pickIndex: number;
  round: number;
  playerId: string;
  actualIndex: number;
  candidates: FeatureVector[];
};

export type CalibrationCoverage = {
  year: string;
  rawRankingSources: number;
  rankingSources: number;
  chronologicalPicks: number;
  eligiblePicks: number;
  observations: number;
  missingCompositeRanks: number;
};

export type RuntimeCoefficients = {
  positionPenalty: number;
  byePenalty: number;
  baseTemperature: number;
  roundGrowth: number;
};

export type CalibrationMeans = {
  actualRankIndex: number;
  expectedRankIndex: number;
  actualSaturation: number;
  expectedSaturation: number;
  actualByeMatches: number;
  expectedByeMatches: number;
};

export type CalibrationSummary = {
  observations: number;
  negativeLogLikelihood: number;
  meanNegativeLogLikelihood: number;
  effectiveChoices: number;
  means: CalibrationMeans;
};

type HistoricalSeason = {
  year: string;
  wrapped: WrappedType;
  rawRankings: Record<string, Record<string, number>>;
};

type ScaledWeights = [
  rank: number,
  saturation: number,
  bye: number,
  roundGrowth: number,
];

const ROUND_LIMIT = 14;
export const HISTORICAL_CALIBRATION_ROSTER: RosterSettings = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 2,
  SUPERFLEX: 1,
  DST: 1,
  K: 0,
  BENCH: 5,
};
const LEGACY_COEFFICIENTS: RuntimeCoefficients = {
  positionPenalty: 16,
  byePenalty: 9,
  baseTemperature: 3.5,
  roundGrowth: 0,
};
const PREVIOUS_POOLED_COEFFICIENTS: RuntimeCoefficients = {
  positionPenalty: 10.849574,
  byePenalty: 0,
  baseTemperature: 8.737719,
  roundGrowth: 0,
};

const HISTORICAL_SEASONS: HistoricalSeason[] = [
  {
    year: "2024",
    wrapped: wrapped2024Json as unknown as WrappedType,
    rawRankings: draft2024Json as Record<string, Record<string, number>>,
  },
  {
    year: "2025",
    wrapped: wrapped2025Json as unknown as WrappedType,
    rawRankings: draft2025Json as Record<string, Record<string, number>>,
  },
];

export function buildHistoricalCalibrationData(): {
  observations: CalibrationObservation[];
  coverage: CalibrationCoverage[];
} {
  const built = HISTORICAL_SEASONS.map(buildSeasonObservations);
  return {
    observations: built.flatMap((season) => season.observations),
    coverage: built.map((season) => season.coverage),
  };
}

function buildSeasonObservations(season: HistoricalSeason): {
  observations: CalibrationObservation[];
  coverage: CalibrationCoverage;
} {
  const { wrapped } = season;
  const rankingSources = normalizeRankingSources(
    season.rawRankings,
    wrapped
  );
  const playersById = Object.fromEntries(
    Object.values(wrapped.nflPlayers).map((player) => [
      player.id,
      {
        id: player.id,
        position: player.position,
        byeWeek: wrapped.nflTeams[player.nflTeamId]?.byeWeek ?? 0,
      } satisfies MockDraftPlayer,
    ])
  );
  const playerIds = Object.keys(playersById);
  const composite = getFormatAwareRankings(
    rankingSources,
    playerIds,
    Object.fromEntries(
      Object.values(wrapped.nflPlayers).map((player) => [
        player.id,
        player.position,
      ])
    )
  ).composite;
  const orderedRanking = Object.keys(composite).sort(
    (left, right) => composite[left] - composite[right] || left.localeCompare(right)
  );
  const chronologicalPicks = Object.values(wrapped.ffTeams)
    .flatMap((team) =>
      team.draft.map((pick) => ({
        teamId: team.id,
        playerId: String(pick.playerId),
        pickIndex: pick.pickIndex,
      }))
    )
    .sort((left, right) => left.pickIndex - right.pickIndex)
    .slice(0, ROUND_LIMIT * Object.keys(wrapped.ffTeams).length);
  const expectedPickCount = ROUND_LIMIT * Object.keys(wrapped.ffTeams).length;
  if (
    chronologicalPicks.length !== expectedPickCount ||
    chronologicalPicks.some((pick, index) => pick.pickIndex !== index)
  ) {
    throw new Error(
      `${season.year} draft does not contain ${expectedPickCount} chronological picks`
    );
  }

  const selectedPlayerIds = new Set<string>();
  const teamPlayerIds: Record<string, string[]> = Object.fromEntries(
    Object.values(wrapped.ffTeams).map((team) => [team.id, []])
  );
  const observations: CalibrationObservation[] = [];
  let eligiblePicks = 0;
  let missingCompositeRanks = 0;

  chronologicalPicks.forEach((pick) => {
    const player = playersById[pick.playerId];
    if (!player) {
      throw new Error(
        `${season.year} pick ${pick.pickIndex} has no player data for ${pick.playerId}`
      );
    }
    if (isMockDraftPlayerEligible(player)) {
      eligiblePicks += 1;
      const availablePlayerIds = orderedRanking.filter(
        (playerId) =>
          !selectedPlayerIds.has(playerId) &&
          isMockDraftPlayerEligible(playersById[playerId])
      );
      const actualIndex = availablePlayerIds.indexOf(pick.playerId);
      if (actualIndex === -1) {
        missingCompositeRanks += 1;
      } else {
        const candidates = availablePlayerIds.map<FeatureVector>(
          (playerId, rankIndex) => {
            const features = getMockDraftChoiceFeatures(
              teamPlayerIds[pick.teamId],
              playerId,
              playersById,
              HISTORICAL_CALIBRATION_ROSTER
            );
            return [rankIndex, features.saturation, features.byeMatches];
          }
        );
        observations.push({
          year: season.year,
          pickIndex: pick.pickIndex,
          round:
            Math.floor(pick.pickIndex / Object.keys(wrapped.ffTeams).length) +
            1,
          playerId: pick.playerId,
          actualIndex,
          candidates,
        });
      }
    }
    selectedPlayerIds.add(pick.playerId);
    teamPlayerIds[pick.teamId].push(pick.playerId);
  });

  return {
    observations,
    coverage: {
      year: season.year,
      rawRankingSources: Object.keys(season.rawRankings).length,
      rankingSources: Object.values(rankingSources).filter(
        (source) => Object.keys(source).length > 0
      ).length,
      chronologicalPicks: chronologicalPicks.length,
      eligiblePicks,
      observations: observations.length,
      missingCompositeRanks,
    },
  };
}

function normalizeRankingSources(
  rawRankings: Record<string, Record<string, number>>,
  wrapped: WrappedType
): RankingSources {
  const normalizedNameToId = Object.fromEntries(
    Object.values(wrapped.nflPlayers).map((player) => [
      normalizeDraftPlayerName(player.name),
      player.id,
    ])
  );
  return Object.fromEntries(
    Object.entries(rawRankings).map(([sourceName, rankings]) => [
      sourceName,
      Object.fromEntries(
        Object.entries(rankings).flatMap(([playerName, rank]) => {
          const playerId = normalizedNameToId[
            normalizeDraftPlayerName(playerName)
          ];
          return playerId ? [[playerId, rank]] : [];
        })
      ),
    ])
  );
}

export function fitHistoricalCoefficients(
  observations: CalibrationObservation[]
): RuntimeCoefficients {
  if (observations.length === 0) {
    throw new Error("Cannot calibrate without historical observations");
  }
  const startingWeights = [
    runtimeToScaledWeights({ ...LEGACY_COEFFICIENTS, roundGrowth: 0.5 }),
    [0.2, 1, 1, 0.5] as ScaledWeights,
    [0.5, 0.1, 0.1, 0.25] as ScaledWeights,
    [0.05, 5, 1, 0.75] as ScaledWeights,
  ];
  const fits = startingWeights.map((weights) =>
    nelderMead(
      weights.map((weight) => Math.log(weight)),
      (logWeights) =>
        negativeLogLikelihood(
          observations,
          logWeights.map((weight) => Math.exp(weight)) as ScaledWeights
        )
    )
  );
  const best = fits.sort((left, right) => left.value - right.value)[0];
  if (!best.converged) {
    throw new Error("Historical coefficient optimizer did not converge");
  }
  const scaled = best.point.map((weight) => Math.exp(weight)) as ScaledWeights;
  return scaledWeightsToRuntime(scaled);
}

export function summarizeCalibration(
  observations: CalibrationObservation[],
  coefficients: RuntimeCoefficients
): CalibrationSummary {
  const weights = runtimeToScaledWeights(coefficients);
  const actualTotals: FeatureVector = [0, 0, 0];
  const expectedTotals: FeatureVector = [0, 0, 0];
  let negativeLogLikelihoodTotal = 0;

  observations.forEach((observation) => {
    const costs = observation.candidates.map((features) =>
      scaledCost(weights, observation.round, features)
    );
    const minCost = Math.min(...costs);
    const unnormalized = costs.map((cost) =>
      Math.exp(-(cost - minCost))
    );
    const total = unnormalized.reduce((sum, value) => sum + value, 0);
    const probabilities = unnormalized.map((value) => value / total);
    negativeLogLikelihoodTotal +=
      costs[observation.actualIndex] - minCost + Math.log(total);
    const actual = observation.candidates[observation.actualIndex];
    for (let featureIndex = 0; featureIndex < 3; featureIndex += 1) {
      actualTotals[featureIndex] += actual[featureIndex];
      expectedTotals[featureIndex] += observation.candidates.reduce(
        (sum, features, candidateIndex) =>
          sum + probabilities[candidateIndex] * features[featureIndex],
        0
      );
    }
  });

  const count = observations.length;
  const means = {
    actualRankIndex: actualTotals[0] / count,
    expectedRankIndex: expectedTotals[0] / count,
    actualSaturation: actualTotals[1] / count,
    expectedSaturation: expectedTotals[1] / count,
    actualByeMatches: actualTotals[2] / count,
    expectedByeMatches: expectedTotals[2] / count,
  };
  return {
    observations: count,
    negativeLogLikelihood: negativeLogLikelihoodTotal,
    meanNegativeLogLikelihood: negativeLogLikelihoodTotal / count,
    effectiveChoices: Math.exp(negativeLogLikelihoodTotal / count),
    means,
  };
}

export function runHistoricalCalibration() {
  const data = buildHistoricalCalibrationData();
  const fitted = fitHistoricalCoefficients(data.observations);
  return {
    coverage: data.coverage,
    fitted,
    legacy: {
      coefficients: LEGACY_COEFFICIENTS,
      summary: summarizeCalibration(data.observations, LEGACY_COEFFICIENTS),
    },
    previousPooled: {
      coefficients: PREVIOUS_POOLED_COEFFICIENTS,
      summary: summarizeCalibration(
        data.observations,
        PREVIOUS_POOLED_COEFFICIENTS
      ),
    },
    roundAware: summarizeCalibration(data.observations, fitted),
    years: Object.fromEntries(
      HISTORICAL_SEASONS.map(({ year }) => [
        year,
        summarizeCalibration(
          data.observations.filter((observation) => observation.year === year),
          fitted
        ),
      ])
    ),
    rounds: Object.fromEntries(
      Array.from({ length: ROUND_LIMIT }, (_, index) => {
        const round = index + 1;
        return [
          round,
          summarizeCalibration(
            data.observations.filter(
              (observation) => observation.round === round
            ),
            fitted
          ),
        ];
      })
    ),
  };
}

function runtimeToScaledWeights(
  coefficients: RuntimeCoefficients
): ScaledWeights {
  return [
    1 / coefficients.baseTemperature,
    coefficients.positionPenalty / coefficients.baseTemperature,
    coefficients.byePenalty / coefficients.baseTemperature,
    coefficients.roundGrowth,
  ];
}

function scaledWeightsToRuntime(weights: ScaledWeights): RuntimeCoefficients {
  return {
    positionPenalty: weights[1] / weights[0],
    byePenalty: weights[2] / weights[0],
    baseTemperature: 1 / weights[0],
    roundGrowth: weights[3],
  };
}

function negativeLogLikelihood(
  observations: CalibrationObservation[],
  weights: ScaledWeights
): number {
  return observations.reduce((totalNll, observation) => {
    const costs = observation.candidates.map((features) =>
      scaledCost(weights, observation.round, features)
    );
    const minCost = Math.min(...costs);
    const logNormalizer =
      -minCost +
      Math.log(
        costs.reduce(
          (sum, cost) => sum + Math.exp(-(cost - minCost)),
          0
        )
      );
    return totalNll + costs[observation.actualIndex] + logNormalizer;
  }, 0);
}

function scaledCost(
  weights: ScaledWeights,
  round: number,
  features: FeatureVector
): number {
  return dot(weights, features) / Math.pow(round, weights[3]);
}

function dot(weights: ScaledWeights, features: FeatureVector): number {
  return (
    weights[0] * features[0] +
    weights[1] * features[1] +
    weights[2] * features[2]
  );
}

function nelderMead(
  start: number[],
  objective: (point: number[]) => number
): { point: number[]; value: number; converged: boolean } {
  const dimension = start.length;
  let simplex = [start.slice()].concat(
    start.map((_, axis) =>
      start.map((value, index) => value + (index === axis ? 0.25 : 0))
    )
  );
  let values = simplex.map(objective);

  for (let iteration = 0; iteration < 1200; iteration += 1) {
    const ordered = simplex
      .map((point, index) => ({ point, value: values[index] }))
      .sort((left, right) => left.value - right.value);
    simplex = ordered.map(({ point }) => point);
    values = ordered.map(({ value }) => value);
    const valueSpread = Math.max(...values) - Math.min(...values);
    const coordinateSpread = Math.max(
      ...simplex.slice(1).flatMap((point) =>
        point.map((value, index) => Math.abs(value - simplex[0][index]))
      )
    );
    if (valueSpread < 1e-9 && coordinateSpread < 1e-7) {
      return { point: simplex[0], value: values[0], converged: true };
    }

    const centroid = Array.from({ length: dimension }, (_, index) =>
      simplex
        .slice(0, dimension)
        .reduce((sum, point) => sum + point[index], 0) / dimension
    );
    const worst = simplex[dimension];
    const reflected = centroid.map(
      (value, index) => value + (value - worst[index])
    );
    const reflectedValue = objective(reflected);

    if (reflectedValue < values[0]) {
      const expanded = centroid.map(
        (value, index) => value + 2 * (reflected[index] - value)
      );
      const expandedValue = objective(expanded);
      simplex[dimension] =
        expandedValue < reflectedValue ? expanded : reflected;
      values[dimension] = Math.min(expandedValue, reflectedValue);
      continue;
    }
    if (reflectedValue < values[dimension - 1]) {
      simplex[dimension] = reflected;
      values[dimension] = reflectedValue;
      continue;
    }

    const contracted = centroid.map(
      (value, index) =>
        value + 0.5 * ((reflectedValue < values[dimension] ? reflected : worst)[index] - value)
    );
    const contractedValue = objective(contracted);
    if (contractedValue < Math.min(reflectedValue, values[dimension])) {
      simplex[dimension] = contracted;
      values[dimension] = contractedValue;
      continue;
    }

    simplex = simplex.map((point, pointIndex) =>
      pointIndex === 0
        ? point
        : point.map(
            (value, index) => simplex[0][index] + 0.5 * (value - simplex[0][index])
          )
    );
    values = simplex.map(objective);
  }

  const bestIndex = values.indexOf(Math.min(...values));
  return {
    point: simplex[bestIndex],
    value: values[bestIndex],
    converged: false,
  };
}
