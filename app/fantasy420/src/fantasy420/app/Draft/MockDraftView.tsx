import { FormEvent, useMemo, useState } from "react";

import {
  createSeed,
  DEFAULT_MOCK_DRAFT_SETTINGS,
  DraftPosition,
  getDraftView,
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
  onStart: (settings: MockDraftSettings) => void;
}) {
  const [settings, setSettings] = useState<MockDraftSettings>(() => ({
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    roster: { ...DEFAULT_MOCK_DRAFT_SETTINGS.roster },
  }));
  const [error, setError] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
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
    setSettings((current) => ({ ...current, [key]: Number(value) }));
  }

  return (
    <form className="mock-draft-setup" onSubmit={submit}>
      <div className="mock-draft-setup-title">mock draft</div>
      <div className="mock-draft-fields">
        <NumberField
          label="draft position"
          value={settings.draftPosition}
          min={1}
          step={1}
          onChange={(value) => setNumber("draftPosition", value)}
        />
        <NumberField
          label="number of teams"
          value={settings.teamCount}
          min={2}
          step={1}
          onChange={(value) => setNumber("teamCount", value)}
        />
        <NumberField
          label="position riskiness"
          value={settings.positionRisk}
          min={0.0001}
          step="any"
          onChange={(value) => setNumber("positionRisk", value)}
        />
        <NumberField
          label="bye riskiness"
          value={settings.byeRisk}
          min={0.0001}
          step="any"
          onChange={(value) => setNumber("byeRisk", value)}
        />
        <NumberField
          label="craziness"
          value={settings.craziness}
          min={0.0001}
          step="any"
          onChange={(value) => setNumber("craziness", value)}
        />
        <label className="mock-draft-field">
          <span>seed</span>
          <input
            aria-label="seed"
            value={settings.seed}
            placeholder="random"
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                seed: event.target.value,
              }))
            }
          />
        </label>
        {ROSTER_SLOTS.map((slot) => (
          <NumberField
            key={slot}
            label={`${slot} slots`}
            value={settings.roster[slot]}
            min={0}
            step={1}
            onChange={(value) =>
              setSettings((current) => ({
                ...current,
                roster: { ...current.roster, [slot]: Number(value) },
              }))
            }
          />
        ))}
      </div>
      <button className="mock-draft-start" type="submit">
        mock draft
      </button>
      {error ? <div className="mock-draft-error">{error}</div> : null}
    </form>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  min: number;
  step: number | "any";
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
  const [order, setOrder] = useState<"pick" | "position">("pick");
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

  const orderedPicks =
    order === "position"
      ? view.picks.slice().sort((a, b) => {
          const aPlayer = props.playersById[a.playerId];
          const bPlayer = props.playersById[b.playerId];
          return (
            POSITION_ORDER.indexOf(normalizePosition(aPlayer.position)) -
              POSITION_ORDER.indexOf(normalizePosition(bPlayer.position)) ||
            a.pickIndex - b.pickIndex
          );
        })
      : view.picks;

  return (
    <section
      className={`mock-draft-panel mock-draft-panel-${order}`}
      data-testid="mock-draft-panel"
      data-order={order}
      onClick={() => setOrder((current) => (current === "pick" ? "position" : "pick"))}
    >
      <header className="mock-draft-header">
        <h2>mock draft</h2>
        <span>{currentLabel}</span>
      </header>
      {order === "pick" ? (
        <SnakeBoard
          {...props}
          picks={orderedPicks}
          failedImages={failedImages}
          onImageError={(playerId) =>
            setFailedImages((current) => new Set(current).add(playerId))
          }
        />
      ) : (
        <div className="mock-draft-board mock-draft-board-position">
          {orderedPicks.map((pick) => (
            <PickBubble
              key={pick.pickIndex}
              pick={pick}
              player={props.playersById[pick.playerId]}
              imageFailed={failedImages.has(pick.playerId)}
              onImageError={() =>
                setFailedImages((current) => new Set(current).add(pick.playerId))
              }
              onNudge={props.onNudge}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SnakeBoard(
  props: Parameters<typeof MockDraftPanel>[0] & {
    picks: ReturnType<typeof getDraftView>["picks"];
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
  const picksByIndex = new Map(props.picks.map((pick) => [pick.pickIndex, pick]));
  const cells = [];
  for (let round = 1; round <= lastRound; round += 1) {
    for (let draftPosition = 1; draftPosition <= settings.teamCount; draftPosition += 1) {
      const pickIndex =
        (round - 1) * settings.teamCount +
        (round % 2 === 1
          ? draftPosition - 1
          : settings.teamCount - draftPosition);
      const pick = picksByIndex.get(pickIndex);
      cells.push(
        pick ? (
          <PickBubble
            key={pickIndex}
            pick={pick}
            player={props.playersById[pick.playerId]}
            imageFailed={props.failedImages.has(pick.playerId)}
            onImageError={() => props.onImageError(pick.playerId)}
            onNudge={props.onNudge}
          />
        ) : (
          <div
            key={pickIndex}
            className={`mock-draft-pick mock-draft-empty ${
              draftPosition === settings.draftPosition ? "mock-draft-mine" : ""
            }`}
          >
            {getPickLabel(pickIndex, settings.teamCount)}
          </div>
        )
      );
    }
  }
  return (
    <div
      className="mock-draft-board"
      style={{
        gridTemplateColumns: `repeat(${settings.teamCount}, minmax(118px, 1fr))`,
      }}
    >
      {cells}
    </div>
  );
}

function PickBubble(props: {
  pick: ReturnType<typeof getDraftView>["picks"][number];
  player: MockDraftDisplayPlayer;
  imageFailed: boolean;
  onImageError: () => void;
  onNudge: (pickIndex: number, direction: "better" | "worse") => void;
}) {
  const headshot = getEspnHeadshotUrl(props.player.id);
  return (
    <article
      className={`mock-draft-pick ${props.pick.isUser ? "mock-draft-mine" : ""}`}
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
            {normalizePosition(props.player.position)}
          </div>
        )}
        <div>
          <div className="mock-draft-player-name">
            {props.player.name}
            {props.player.rookie ? "*" : ""}
          </div>
          <div className="mock-draft-player-detail">
            <b>{normalizePosition(props.player.position)}</b> · bye {props.player.byeWeek}
          </div>
        </div>
      </div>
      <div className="mock-draft-pick-facts">
        <span className="mock-draft-pick-number">{props.pick.label}</span>
        <span className="mock-draft-rank">#{props.pick.rank}</span>
      </div>
      <div className="mock-draft-nudge">
        <button
          type="button"
          aria-label={`make pick ${props.pick.label} better`}
          onClick={(event) => {
            event.stopPropagation();
            props.onNudge(props.pick.pickIndex, "better");
          }}
        >
          ← better
        </button>
        <button
          type="button"
          aria-label={`make pick ${props.pick.label} worse`}
          onClick={(event) => {
            event.stopPropagation();
            props.onNudge(props.pick.pickIndex, "worse");
          }}
        >
          worse →
        </button>
      </div>
    </article>
  );
}

export function getEspnHeadshotUrl(playerId: string): string | undefined {
  return Number(playerId) > 0
    ? `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`
    : undefined;
}
