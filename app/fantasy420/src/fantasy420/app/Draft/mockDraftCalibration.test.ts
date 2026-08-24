import {
  MOCK_DRAFT_BASE_TEMPERATURE,
  MOCK_DRAFT_BYE_PENALTY,
  MOCK_DRAFT_POSITION_PENALTY,
  MOCK_DRAFT_ROUND_GROWTH,
} from "./mockDraft";
import {
  buildHistoricalCalibrationData,
  HISTORICAL_CALIBRATION_ROSTER,
  runHistoricalCalibration,
} from "./mockDraftCalibration";

test("replays complete first-fourteen-round historical calibration samples", () => {
  const { observations, coverage } = buildHistoricalCalibrationData();

  expect(coverage).toEqual([
    {
      year: "2024",
      rawRankingSources: 11,
      rankingSources: 9,
      chronologicalPicks: 140,
      eligiblePicks: 139,
      observations: 139,
      missingCompositeRanks: 0,
    },
    {
      year: "2025",
      rawRankingSources: 9,
      rankingSources: 8,
      chronologicalPicks: 140,
      eligiblePicks: 137,
      observations: 137,
      missingCompositeRanks: 0,
    },
  ]);
  expect(observations).toHaveLength(276);
  expect(observations[0].round).toBe(1);
  expect(observations.at(-1)?.round).toBe(14);
  expect(HISTORICAL_CALIBRATION_ROSTER).toMatchObject({
    DST: 1,
    K: 0,
    BENCH: 5,
  });
});

test("fits the checked-in baseline and improves historical likelihood", () => {
  const report = runHistoricalCalibration();

  expect(report.fitted.positionPenalty).toBeCloseTo(
    MOCK_DRAFT_POSITION_PENALTY,
    5
  );
  expect(report.fitted.byePenalty).toBeCloseTo(MOCK_DRAFT_BYE_PENALTY, 5);
  expect(report.fitted.baseTemperature).toBeCloseTo(
    MOCK_DRAFT_BASE_TEMPERATURE,
    5
  );
  expect(report.fitted.roundGrowth).toBeCloseTo(
    MOCK_DRAFT_ROUND_GROWTH,
    5
  );
  expect(report.roundAware.negativeLogLikelihood).toBeLessThan(
    report.legacy.summary.negativeLogLikelihood
  );
  expect(report.roundAware.negativeLogLikelihood).toBeLessThan(
    report.previousPooled.summary.negativeLogLikelihood
  );
  expect(report.rounds["1"].means.expectedOverallRankIndex).toBeLessThan(5);
  expect(report.rounds["14"].means.expectedOverallRankIndex).toBeGreaterThan(
    report.rounds["1"].means.expectedOverallRankIndex * 20
  );
});
