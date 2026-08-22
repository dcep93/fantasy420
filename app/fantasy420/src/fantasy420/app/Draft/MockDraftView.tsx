import { FormEvent, useMemo, useState } from "react";

import {
  createSeed,
  DEFAULT_MOCK_DRAFT_SETTINGS,
  DraftPosition,
  getDraftView,
  getHistoricalNudgeAvailability,
  getPickLabel,
  MockDraftPlayer,
  MockDraftSettings,
  MockDraftState,
  normalizePosition,
  RosterSlot,
  validateMockDraftSettings,
} from "./mockDraft";
import "./MockDraftView.css";

const ROSTER_SLOTS: RosterSlot[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "FLEX",
  "SUPERFLEX",
  "DST",
  "K",
  "BENCH",
];
const POSITION_ORDER: DraftPosition[] = ["QB", "RB", "WR", "TE", "DST", "K"];

export type MockDraftDisplayPlayer = MockDraftPlayer & {
  name: string;
  rookie: boolean;
};

export function MockDraftSetup(props: {
  activeSettings?: MockDraftSettings;
  onStart?: (settings: MockDraftSettings) => void;
}) {
  const [editableSettings, setEditableSettings] = useState<MockDraftSettings>(() => ({
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    roster: { ...DEFAULT_MOCK_DRAFT_SETTINGS.roster },
  }));
  const [error, setError] = useState("");
  const active = props.activeSettings !== undefined;
  const settings = props.activeSettings || editableSettings;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (active || !props.onStart) return;
    const resolved = {
      ...settings,
      seed: settings.seed.trim() || createSeed(),
    };
    try {
      validateMockDraftSettings(resolved);
      setError("");
      props.onStart(resolved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  function setNumber(
    key: "draftPosition" | "teamCount" | "positionRisk" | "byeRisk" | "craziness",
    value: string
  ) {
    setEditableSettings((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <form className="mock-draft-setup" onSubmit={submit}>
      <div className="mock-draft-setup-title">mock draft</div>
      <div
        className="mock-draft-fields mock-draft-primary-fields"
        data-testid="mock-draft-primary-fields"
      >
        <NumberField
          label="draft position"
          value={settings.draftPosition}
          min={1}
          step={1}
          disabled={active}
          onChange={(value) => setNumber("draftPosition", value)}
        />
        <NumberField
          label="number of teams"
          value={settings.teamCount}
          min={2}
          step={1}
          disabled={active}
          onChange={(value) => setNumber("teamCount", value)}
        />
        <NumberField
          label="position riskiness"
          value={settings.positionRisk}
          min={0.0001}
          step="any"
          disabled={active}
          onChange={(value) => setNumber("positionRisk", value)}
        />
        <NumberField
          label="bye riskiness"
          value={settings.byeRisk}
          min={0.0001}
          step="any"
          disabled={active}
          onChange={(value) => setNumber("byeRisk", value)}
        />
        <NumberField
          label="craziness"
          value={settings.craziness}
          min={0.0001}
          step="any"
          disabled={active}
          onChange={(value) => setNumber("craziness", value)}
        />
        <label className="mock-draft-field">
          <span>seed</span>
          <input
            aria-label="seed"
            value={settings.seed}
            placeholder="random"
            readOnly={active}
            onFocus={(event) => {
              if (active) event.currentTarget.select();
            }}
            onChange={(event) =>
              setEditableSettings((current) => ({
                ...current,
                seed: event.target.value,
              }))
            }
          />
        </label>
      </div>
      <div
        className="mock-draft-fields mock-draft-roster-fields"
        data-testid="mock-draft-roster-fields"
      >
        {ROSTER_SLOTS.map((slot) => (
          <NumberField
            key={slot}
            label={`${slot} slots`}
            value={settings.roster[slot]}
            min={0}
            step={1}
            disabled={active}
            onChange={(value) =>
              setEditableSettings((current) => ({
                ...current,
                roster: { ...current.roster, [slot]: Number(value) },
              }))
            }
          />
        ))}
      </div>
      {!active ? (
        <button className="mock-draft-start" type="submit">
          mock draft
        </button>
      ) : null}
      {error ? <div className="mock-draft-error">{error}</div> : null}
    </form>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  min: number;
  step: number | "any";
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mock-draft-field">
      <span>{props.label}</span>
      <input
        type="number"
        aria-label={props.label}
        value={props.value}
        min={props.min}
        step={props.step}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

export function MockDraftPanel(props: {
  state: MockDraftState;
  playersById: Record<string, MockDraftDisplayPlayer>;
  orderedRanking: string[];
  onNudge: (pickIndex: number, direction: "better" | "worse") => void;
}) {
  const [order, setOrder] = useState<"round" | "position">("round");
  const [failedImages, setFailedImages] = useState<Set<string>>(
    () => new Set()
  );
  const view = useMemo(
    () => getDraftView(props.state, props.playersById, props.orderedRanking),
    [props.state, props.playersById, props.orderedRanking]
  );
  const currentLabel = view.complete
    ? "complete"
    : view.currentOwner?.draftPosition === props.state.settings.draftPosition
    ? `your pick ${getPickLabel(
        props.state.picks.length,
        props.state.settings.teamCount
      )}`
    : "drafting…";

  return (
    <section
      className={`mock-draft-panel mock-draft-panel-${order}`}
      data-testid="mock-draft-panel"
      data-order={order}
      onClick={() =>
        setOrder((current) => (current === "round" ? "position" : "round"))
      }
    >
      <header className="mock-draft-header">
        <h2>mock draft</h2>
        <span>{currentLabel}</span>
      </header>
      <TeamBoard
        {...props}
        picks={view.picks}
        order={order}
        failedImages={failedImages}
        onImageError={(playerId) =>
          setFailedImages((current) => new Set(current).add(playerId))
        }
      />
    </section>
  );
}

function TeamBoard(
  props: Parameters<typeof MockDraftPanel>[0] & {
    picks: ReturnType<typeof getDraftView>["picks"];
    order: "round" | "position";
    failedImages: Set<string>;
    onImageError: (playerId: string) => void;
  }
) {
  const settings = props.state.settings;
  const lastRound = Math.max(
    1,
    Math.min(
      Object.values(settings.roster).reduce((sum, value) => sum + value, 0),
      Math.floor(props.state.picks.length / settings.teamCount) + 1
    )
  );
  const latestRoundAnchorTeam = settings.draftPosition === 1 ? 2 : 1;

  return (
    <div
      className="mock-draft-board"
      style={{
        gridTemplateColumns: `repeat(${settings.teamCount}, minmax(118px, 1fr))`,
      }}
    >
      {Array.from({ length: settings.teamCount }, (_, index) => index + 1).map(
        (draftPosition) => {
          const isUser = draftPosition === settings.draftPosition;
          const roundCells = Array.from({ length: lastRound }, (_, roundIndex) => {
            const round = roundIndex + 1;
            const pickIndex =
              roundIndex * settings.teamCount +
              (round % 2 === 1
                ? draftPosition - 1
                : settings.teamCount - draftPosition);
            return {
              round,
              pickIndex,
              pick: props.picks.find((candidate) => candidate.pickIndex === pickIndex),
            };
          });
          const orderedCells =
            props.order === "position"
              ? [
                  ...roundCells
                    .filter((cell) => cell.pick)
                    .sort((a, b) => {
                      const aPlayer = props.playersById[a.pick!.playerId];
                      const bPlayer = props.playersById[b.pick!.playerId];
                      return (
                        POSITION_ORDER.indexOf(
                          normalizePosition(aPlayer.position)
                        ) -
                          POSITION_ORDER.indexOf(
                            normalizePosition(bPlayer.position)
                          ) ||
                        a.pick!.pickIndex - b.pick!.pickIndex
                      );
                    }),
                  ...roundCells.filter((cell) => !cell.pick),
                ]
              : roundCells;

          return (
            <div
              key={draftPosition}
              className={`mock-draft-team-column ${
                isUser ? "mock-draft-team-mine" : ""
              }`}
              data-testid={`mock-draft-team-${draftPosition}`}
              data-team-column={draftPosition}
              data-order={props.order}
            >
              {orderedCells.map(({ round, pickIndex, pick }) => {
                const latestRoundAnchor =
                  draftPosition === latestRoundAnchorTeam && round === lastRound;
                if (!pick) {
                  return (
                    <div
                      key={pickIndex}
                      className={`mock-draft-pick mock-draft-empty ${
                        isUser ? "mock-draft-mine" : ""
                      }`}
                      data-mock-latest-round={
                        latestRoundAnchor ? "true" : undefined
                      }
                    >
                      {getPickLabel(pickIndex, settings.teamCount)}
                    </div>
                  );
                }
                const nudge = getHistoricalNudgeAvailability(
                  props.state,
                  pick.pickIndex,
                  props.playersById,
                  props.orderedRanking
                );
                return (
                  <PickBubble
                    key={pickIndex}
                    pick={pick}
                    player={props.playersById[pick.playerId]}
                    imageFailed={props.failedImages.has(pick.playerId)}
                    latestRoundAnchor={latestRoundAnchor}
                    canNudgeBetter={nudge.better}
                    canNudgeWorse={nudge.worse}
                    onImageError={() => props.onImageError(pick.playerId)}
                    onNudge={props.onNudge}
                  />
                );
              })}
            </div>
          );
        }
      )}
    </div>
  );
}

function PickBubble(props: {
  pick: ReturnType<typeof getDraftView>["picks"][number];
  player: MockDraftDisplayPlayer;
  imageFailed: boolean;
  latestRoundAnchor?: boolean;
  canNudgeBetter: boolean;
  canNudgeWorse: boolean;
  onImageError: () => void;
  onNudge: (pickIndex: number, direction: "better" | "worse") => void;
}) {
  const headshot = getEspnHeadshotUrl(props.player.id);
  const position = normalizePosition(props.player.position);
  return (
    <article
      className={`mock-draft-pick mock-draft-position-${position.toLowerCase()} ${
        props.pick.isUser ? "mock-draft-mine" : ""
      }`}
      data-mock-latest-round={props.latestRoundAnchor ? "true" : undefined}
    >
      <div className="mock-draft-player-top">
        {headshot && !props.imageFailed ? (
          <img
            src={headshot}
            alt={props.player.name}
            onError={props.onImageError}
          />
        ) : (
          <div
            className="mock-draft-image-fallback"
            aria-label={`${props.player.name} image fallback`}
          >
            {position}
          </div>
        )}
        <div>
          <div className="mock-draft-player-name">
            {props.player.name}
            {props.player.rookie ? "*" : ""}
          </div>
          <div className="mock-draft-player-detail">
            <b>{position}</b> · bye {props.player.byeWeek}
          </div>
        </div>
      </div>
      <div className="mock-draft-pick-facts">
        <span className="mock-draft-pick-number">
          {props.pick.label}/{props.pick.draftPosition}
        </span>
        <span className="mock-draft-rank-controls">
          <button
            type="button"
            aria-label={`make pick ${props.pick.label} better`}
            disabled={!props.canNudgeBetter}
            onClick={(event) => {
              event.stopPropagation();
              props.onNudge(props.pick.pickIndex, "better");
            }}
          >
            ‹
          </button>
          <span className="mock-draft-rank">#{props.pick.rank}</span>
          <button
            type="button"
            aria-label={`make pick ${props.pick.label} worse`}
            disabled={!props.canNudgeWorse}
            onClick={(event) => {
              event.stopPropagation();
              props.onNudge(props.pick.pickIndex, "worse");
            }}
          >
            ›
          </button>
        </span>
      </div>
    </article>
  );
}

export function getEspnHeadshotUrl(playerId: string): string | undefined {
  return Number(playerId) > 0
    ? `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`
    : undefined;
}
