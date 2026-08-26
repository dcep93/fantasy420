import { WrappedType } from "../FetchWrapped";
import allWrapped from "../Wrapped/allWrapped";
import draft2023 from "./2023.json";
import draft2024 from "./2024.json";
import draft2025 from "./2025.json";
import draft2026 from "./2026.json";
import getFormatAwareRankings, {
  RankingSources,
  RankMap,
} from "./composite";
import { normalizeDraftPlayerName } from "./rookies";

export type PlayersType = RankMap;
export type DraftJsonType = RankingSources;

export const rawDrafts: Record<string, DraftJsonType> = {
  2023: draft2023,
  2024: draft2024,
  2025: draft2025,
  2026: draft2026,
};

function getNormalizedNameToId(wrapped: WrappedType): Record<string, string> {
  return Object.fromEntries(
    Object.values(wrapped.nflPlayers).map((player) => [
      normalizeDraftPlayerName(player.name),
      player.id,
    ])
  );
}

const draftsByYear: Record<string, DraftJsonType> = Object.fromEntries(
  Object.entries(rawDrafts).map(([year, rawDraft]) => {
    const wrapped = allWrapped[year];
    const normalizedNameToId = wrapped ? getNormalizedNameToId(wrapped) : {};
    return [
      year,
      Object.fromEntries(
        Object.entries(rawDraft).map(([source, players]) => [
          source,
          Object.fromEntries(
            Object.entries(players)
              .map(([name, value]) => ({
                playerId: normalizedNameToId[normalizeDraftPlayerName(name)],
                value,
              }))
              .filter(({ playerId }) => playerId)
              .sort((left, right) => left.value - right.value)
              .map(({ playerId, value }) => [playerId, value])
          ),
        ])
      ),
    ];
  })
);

export function getDraftForYear(year: string): DraftJsonType | undefined {
  return draftsByYear[year];
}

export function getCompositeForYear(year: string): PlayersType | undefined {
  const sources = getDraftForYear(year);
  const wrapped = allWrapped[year];
  if (!sources || !wrapped) return undefined;

  const players = Object.values(wrapped.nflPlayers);
  return getFormatAwareRankings(
    sources,
    players.map((player) => player.id),
    Object.fromEntries(
      players.map((player) => [player.id, player.position])
    )
  ).composite;
}
