import {
  MOCK_DRAFT_BYE_PENALTY,
  MOCK_DRAFT_POSITION_PENALTY,
  MOCK_DRAFT_TEMPERATURE,
} from "./mockDraft";
import {
  buildHistoricalCalibrationData,
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
});

test("fits the checked-in baseline and improves historical likelihood", () => {
  const report = runHistoricalCalibration();

  expect(report.fitted.positionPenalty).toBeCloseTo(
    MOCK_DRAFT_POSITION_PENALTY,
    5
  );
  expect(report.fitted.byePenalty).toBeCloseTo(MOCK_DRAFT_BYE_PENALTY, 5);
  expect(report.fitted.temperature).toBeCloseTo(MOCK_DRAFT_TEMPERATURE, 5);
  expect(report.pooled.negativeLogLikelihood).toBeLessThan(
    report.legacy.summary.negativeLogLikelihood
  );
  expect(report.pooled.means.expectedRankIndex).toBeCloseTo(
    report.pooled.means.actualRankIndex,
    5
  );
  expect(report.pooled.means.expectedSaturation).toBeCloseTo(
    report.pooled.means.actualSaturation,
    5
  );
});
