type DraftRankings = Record<string, Record<string, number>>;

type PlayerNamesById = Record<string, { name: string }>;

export function normalizeDraftPlayerName(name: string): string {
  return name
    .toLocaleLowerCase()
    .replaceAll(/[^A-Za-z0-9 ]/g, "")
    .replaceAll(/ i+$/g, "")
    .replaceAll(/gabriel davis$/gi, "gabe davis")
    .replaceAll(/hollywood brown$/gi, "marquise brown")
    .replaceAll(/nathaniel dell$/gi, "tank dell")
    .replaceAll(/cameron skattebo$/gi, "cam skattebo")
    .replaceAll(/cameron ward$/gi, "cam ward")
    .replaceAll(/kenneth gainwell$/gi, "kenny gainwell")
    .replaceAll(/chigoziem okonkwo$/gi, "chig okonkwo")
    .replaceAll(/andres borregales$/gi, "andy borregales")
    .replaceAll(/ sr$/gi, "")
    .replaceAll(/ jr$/gi, "");
}

export function getRookiePlayerIds(
  playersById: PlayerNamesById,
  previousYearDraft: DraftRankings | undefined
): Set<string> {
  if (previousYearDraft === undefined) return new Set();

  const previousYearPlayerNames = new Set(
    Object.values(previousYearDraft).flatMap((rankings) =>
      Object.keys(rankings).map(normalizeDraftPlayerName)
    )
  );

  return new Set(
    Object.entries(playersById)
      .filter(
        ([, player]) =>
          !previousYearPlayerNames.has(normalizeDraftPlayerName(player.name))
      )
      .map(([playerId]) => playerId)
  );
}
