export function getPointsPerGame(scores: (number | null)[]) {
  const gameScores = scores.filter(
    (score): score is number => score !== null && score !== 0
  );
  if (!gameScores.length) {
    return { gamesPlayed: 0, pointsPerGame: 0 };
  }

  return {
    gamesPlayed: gameScores.length,
    pointsPerGame: Number(
      (
        gameScores.reduce((total, score) => total + score, 0) /
        gameScores.length
      ).toFixed(2)
    ),
  };
}
