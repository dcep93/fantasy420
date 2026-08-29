import { selectedWrapped } from "..";
import { POSITION_COLORS } from "../../Draft";
import { NFLPlayerType, WrappedType } from "../../FetchWrapped";

export type OwnershipMove = {
  fromTeamId: string;
  playerId: string;
  toTeamId: string;
  weekNum: string;
};

export type TradeSide = {
  received: OwnershipMove[];
  teamId: string;
};

export type TradeDeal = {
  id: string;
  kind: "exchange" | "direct-move";
  moves: OwnershipMove[];
  sides: [TradeSide, TradeSide];
};

export type TradeWeek = {
  deals: TradeDeal[];
  directMoveCount: number;
  exchangeCount: number;
  moveCount: number;
  weekNum: string;
};

function compareNumericStrings(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}

function compareTeamIds(
  wrapped: WrappedType,
  leftId: string,
  rightId: string
): number {
  return (
    wrapped.ffTeams[leftId].name.localeCompare(
      wrapped.ffTeams[rightId].name,
      undefined,
      { numeric: true }
    ) || compareNumericStrings(leftId, rightId)
  );
}

function compareMoves(
  wrapped: WrappedType,
  left: OwnershipMove,
  right: OwnershipMove
) {
  return (
    Number(left.weekNum) - Number(right.weekNum) ||
    compareTeamIds(wrapped, left.fromTeamId, right.fromTeamId) ||
    compareTeamIds(wrapped, left.toTeamId, right.toTeamId) ||
    wrapped.nflPlayers[left.playerId].name.localeCompare(
      wrapped.nflPlayers[right.playerId].name,
      undefined,
      { numeric: true }
    )
  );
}

export function getOwnershipMoves(wrapped: WrappedType): OwnershipMove[] {
  const ownerByPlayerAndWeek: Record<string, Record<string, string>> = {};

  Object.values(wrapped.ffTeams)
    .sort((left, right) => compareNumericStrings(left.id, right.id))
    .forEach((team) =>
      Object.values(team.rosters).forEach((roster) =>
        roster.rostered.forEach((playerId) => {
          if (!ownerByPlayerAndWeek[playerId]) {
            ownerByPlayerAndWeek[playerId] = {};
          }
          ownerByPlayerAndWeek[playerId][roster.weekNum] = team.id;
        })
      )
    );

  const seen = new Set<string>();
  return Object.values(wrapped.ffTeams)
    .flatMap((team) =>
      Object.values(team.rosters).flatMap((roster) => {
        if (Number(roster.weekNum) <= 1) return [];
        return roster.rostered.flatMap((playerId) => {
          const fromTeamId =
            ownerByPlayerAndWeek[playerId]?.[
              String(Number(roster.weekNum) - 1)
            ];
          const key = `${roster.weekNum}:${playerId}:${fromTeamId}:${team.id}`;
          if (
            !fromTeamId ||
            fromTeamId === team.id ||
            !wrapped.ffTeams[fromTeamId] ||
            !wrapped.nflPlayers[playerId] ||
            seen.has(key)
          ) {
            return [];
          }
          seen.add(key);
          return [
            {
              fromTeamId,
              playerId,
              toTeamId: team.id,
              weekNum: roster.weekNum,
            },
          ];
        });
      })
    )
    .sort((left, right) => compareMoves(wrapped, left, right));
}

export function groupOwnershipMoves(
  wrapped: WrappedType,
  moves: OwnershipMove[] = getOwnershipMoves(wrapped)
): TradeWeek[] {
  const byWeek = new Map<string, Map<string, OwnershipMove[]>>();

  moves.forEach((move) => {
    const pair = [move.fromTeamId, move.toTeamId].sort(compareNumericStrings);
    const pairKey = pair.join(":");
    if (!byWeek.has(move.weekNum)) byWeek.set(move.weekNum, new Map());
    const deals = byWeek.get(move.weekNum)!;
    if (!deals.has(pairKey)) deals.set(pairKey, []);
    deals.get(pairKey)!.push(move);
  });

  return Array.from(byWeek.entries())
    .sort(([left], [right]) => compareNumericStrings(left, right))
    .map(([weekNum, dealMap]) => {
      const deals = Array.from(dealMap.values())
        .map((dealMoves): TradeDeal => {
          const teamIds = Array.from(
            new Set(
              dealMoves.flatMap((move) => [move.fromTeamId, move.toTeamId])
            )
          ).sort((left, right) => compareTeamIds(wrapped, left, right)) as [
            string,
            string
          ];
          const movesSortedByPlayer = [...dealMoves].sort((left, right) =>
            wrapped.nflPlayers[left.playerId].name.localeCompare(
              wrapped.nflPlayers[right.playerId].name,
              undefined,
              { numeric: true }
            )
          );
          return {
            id: `${weekNum}:${teamIds.join(":")}`,
            kind: teamIds.every((teamId) =>
              movesSortedByPlayer.some((move) => move.toTeamId === teamId)
            )
              ? "exchange"
              : "direct-move",
            moves: movesSortedByPlayer,
            sides: teamIds.map((teamId) => ({
              teamId,
              received: movesSortedByPlayer.filter(
                (move) => move.toTeamId === teamId
              ),
            })) as [TradeSide, TradeSide],
          };
        })
        .sort((left, right) =>
          compareTeamIds(wrapped, left.sides[0].teamId, right.sides[0].teamId)
        );

      return {
        deals,
        directMoveCount: deals.filter((deal) => deal.kind === "direct-move")
          .length,
        exchangeCount: deals.filter((deal) => deal.kind === "exchange").length,
        moveCount: deals.reduce((sum, deal) => sum + deal.moves.length, 0),
        weekNum,
      };
    });
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function formatScoreHistory(player: NFLPlayerType, moveWeekNum: string): string {
  const scores = Object.entries(player.scores).sort(([left], [right]) =>
    compareNumericStrings(left, right)
  );
  if (scores.length === 0) return `Moved in week ${moveWeekNum}`;
  return scores
    .map(
      ([weekNum, score]) =>
        `Week ${weekNum}: ${score}${
          weekNum === moveWeekNum ? "  ← moved this week" : ""
        }`
    )
    .join("\n");
}

function PlayerMove({
  move,
  wrapped,
}: {
  move: OwnershipMove;
  wrapped: WrappedType;
}) {
  const player = wrapped.nflPlayers[move.playerId];
  const color = POSITION_COLORS[player.position];
  return (
    <div
      title={formatScoreHistory(player, move.weekNum)}
      style={{
        backgroundColor: color || "var(--night-surface-alt)",
        border: "1px solid var(--night-border)",
        borderRadius: "0.65rem",
        color: color ? "var(--night-position-text)" : "var(--night-text)",
        display: "flex",
        gap: "0.6rem",
        justifyContent: "space-between",
        padding: "0.65rem 0.75rem",
      }}
    >
      <strong>{player.name}</strong>
      <span style={{ fontWeight: 700 }}>{player.position}</span>
    </div>
  );
}

function DealSide({
  side,
  wrapped,
}: {
  side: TradeSide;
  wrapped: WrappedType;
}) {
  const team = wrapped.ffTeams[side.teamId];
  return (
    <section
      aria-label={`${team.name} receives`}
      style={{
        background: "var(--night-surface)",
        border: "1px solid var(--night-border)",
        borderRadius: "0.85rem",
        flex: "1 1 16rem",
        minWidth: 0,
        padding: "0.8rem",
      }}
    >
      <div style={{ marginBottom: "0.65rem" }}>
        <div
          style={{
            color: "var(--night-text-muted)",
            fontSize: "0.7rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Receives
        </div>
        <strong>{team.name}</strong>
      </div>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {side.received.length > 0 ? (
          side.received.map((move) => (
            <PlayerMove
              key={`${move.playerId}:${move.fromTeamId}:${move.toTeamId}`}
              move={move}
              wrapped={wrapped}
            />
          ))
        ) : (
          <div
            style={{
              color: "var(--night-text-muted)",
              fontSize: "0.8rem",
              padding: "0.65rem 0",
            }}
          >
            No players received
          </div>
        )}
      </div>
    </section>
  );
}

function Deal({ deal, wrapped }: { deal: TradeDeal; wrapped: WrappedType }) {
  if (deal.kind === "direct-move") {
    const receivingSide = deal.sides.find((side) => side.received.length > 0)!;
    const move = receivingSide.received[0];
    const fromTeam = wrapped.ffTeams[move.fromTeamId];
    const toTeam = wrapped.ffTeams[move.toTeamId];
    return (
      <article
        data-testid={`trade-deal-${deal.id}`}
        style={{
          alignItems: "stretch",
          background: "var(--night-surface-alt)",
          border: "1px solid var(--night-border)",
          borderRadius: "1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.85rem",
          padding: "0.85rem",
        }}
      >
        <div
          style={{
            color: "var(--night-text-muted)",
            flexBasis: "100%",
            fontSize: "0.75rem",
          }}
        >
          Direct move · {pluralize(deal.moves.length, "player")} moved
        </div>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flex: "1 1 20rem",
            gap: "0.75rem",
            minWidth: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "var(--night-text-muted)",
                fontSize: "0.68rem",
                textTransform: "uppercase",
              }}
            >
              From
            </div>
            <strong>{fromTeam.name}</strong>
          </div>
          <span aria-hidden="true" style={{ color: "var(--night-text-muted)" }}>
            →
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: "var(--night-text-muted)",
                fontSize: "0.68rem",
                textTransform: "uppercase",
              }}
            >
              To
            </div>
            <strong>{toTeam.name}</strong>
          </div>
        </div>
        <div
          aria-label={`${toTeam.name} receives`}
          style={{
            display: "grid",
            flex: "1 1 22rem",
            gap: "0.5rem",
          }}
        >
          {receivingSide.received.map((receivedMove) => (
            <PlayerMove
              key={receivedMove.playerId}
              move={receivedMove}
              wrapped={wrapped}
            />
          ))}
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid={`trade-deal-${deal.id}`}
      style={{
        background: "var(--night-surface-alt)",
        border: "1px solid var(--night-border)",
        borderRadius: "1rem",
        padding: "0.85rem",
      }}
    >
      <div
        style={{
          color: "var(--night-text-muted)",
          fontSize: "0.75rem",
          marginBottom: "0.65rem",
        }}
      >
        Exchange · {pluralize(deal.moves.length, "player")} moved
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {deal.sides.map((side) => (
          <DealSide key={side.teamId} side={side} wrapped={wrapped} />
        ))}
      </div>
    </article>
  );
}

export function TradesForSeason({ wrapped }: { wrapped: WrappedType }) {
  const weeks = groupOwnershipMoves(wrapped);

  if (weeks.length === 0) {
    return <div>No direct ownership moves found for {wrapped.year}.</div>;
  }

  return (
    <div style={{ maxWidth: "72rem", padding: "0 0.75rem 2rem" }}>
      <p style={{ color: "var(--night-text-muted)", marginTop: 0 }}>
        Weekly roster-to-roster moves inferred from consecutive roster snapshots.
      </p>
      <div style={{ display: "grid", gap: "1rem" }}>
        {weeks.map((week) => (
          <section
            key={week.weekNum}
            data-testid={`trade-week-${week.weekNum}`}
            style={{
              borderTop: "1px solid var(--night-border)",
              paddingTop: "0.85rem",
            }}
          >
            <header
              style={{
                alignItems: "baseline",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.55rem",
                justifyContent: "space-between",
                marginBottom: "0.7rem",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", margin: 0 }}>
                Week {week.weekNum}
              </h2>
              <span
                style={{
                  color: "var(--night-text-muted)",
                  fontSize: "0.78rem",
                }}
              >
                {week.exchangeCount > 0
                  ? `${pluralize(week.exchangeCount, "exchange")} · `
                  : ""}
                {week.directMoveCount > 0
                  ? `${pluralize(week.directMoveCount, "direct move")} · `
                  : ""}
                {pluralize(week.moveCount, "player")} moved
              </span>
            </header>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {week.deals.map((deal) => (
                <Deal key={deal.id} deal={deal} wrapped={wrapped} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function Trades() {
  return <TradesForSeason wrapped={selectedWrapped()} />;
}
