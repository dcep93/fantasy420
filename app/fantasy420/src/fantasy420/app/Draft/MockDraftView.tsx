import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createSeed,
  DEFAULT_MOCK_DRAFT_SETTINGS,
  AppetitePosition,
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
import {
  getMockDraftSetupPreferences,
  MockDraftAppetiteInputs,
  MockDraftRiskInputs,
  readMockDraftSetupPreferences,
  saveMockDraftSetupPreferences,
} from "./mockDraftSettingsStorage";
import { getPositionColor } from "./positionColors";
import "./MockDraftView.css";

const ROSTER_SLOTS: RosterSlot[] = [
  "QB",
  "RB",
  "WR",
  "TE",
  "FLEX",
  "SUPERFLEX",
  "DST",
  "BENCH",
];
const POSITION_ORDER: DraftPosition[] = ["QB", "RB", "WR", "TE", "DST", "K"];
const APPETITE_POSITIONS: AppetitePosition[] = ["QB", "RB", "WR", "TE"];
const MIN_RISK_FACTOR = 0.0001;
const MAX_RISK_FACTOR = 10000;

type RiskFactorKey = keyof MockDraftRiskInputs;

type MockDraftSetupForm = {
  editableSettings: MockDraftSettings;
  riskInputs: MockDraftRiskInputs;
  appetiteInputs: MockDraftAppetiteInputs;
};

function normalizeRiskFactor(value: string): number {
  if (value.trim() === "") return MAX_RISK_FACTOR;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return parsed;
  return Math.min(MAX_RISK_FACTOR, Math.max(MIN_RISK_FACTOR, parsed));
}

function copySettings(settings: MockDraftSettings): MockDraftSettings {
  return {
    ...settings,
    appetites: { ...settings.appetites },
    roster: { ...settings.roster },
  };
}

function getRiskInputs(
  settings: MockDraftSettings
): MockDraftRiskInputs {
  return {
    positionRisk: String(settings.positionRisk),
    byeRisk: String(settings.byeRisk),
    craziness: String(settings.craziness),
  };
}

function getAppetiteInputs(
  settings: MockDraftSettings
): MockDraftAppetiteInputs {
  return Object.fromEntries(
    APPETITE_POSITIONS.map((position) => [
      position,
      String(settings.appetites[position]),
    ])
  ) as MockDraftAppetiteInputs;
}

function getSetupForm(settings: MockDraftSettings): MockDraftSetupForm {
  return {
    editableSettings: copySettings(settings),
    riskInputs: getRiskInputs(settings),
    appetiteInputs: getAppetiteInputs(settings),
  };
}

function getInitialSetupForm(
  activeSettings?: MockDraftSettings
): MockDraftSetupForm {
  if (activeSettings) return getSetupForm(activeSettings);
  const saved = readMockDraftSetupPreferences();
  return {
    editableSettings: {
      ...copySettings(DEFAULT_MOCK_DRAFT_SETTINGS),
      draftPosition: saved.draftPosition,
      teamCount: saved.teamCount,
      seed: "",
      roster: { ...saved.roster },
    },
    riskInputs: { ...saved.riskInputs },
    appetiteInputs: { ...saved.appetiteInputs },
  };
}

export type MockDraftDisplayPlayer = MockDraftPlayer & {
  name: string;
  rookie: boolean;
};

export function MockDraftSetup(props: {
  activeSettings?: MockDraftSettings;
  onStart?: (settings: MockDraftSettings) => void;
}) {
  const [form, setForm] = useState<MockDraftSetupForm>(() =>
    getInitialSetupForm(props.activeSettings)
  );
  const [error, setError] = useState("");
  const { editableSettings, riskInputs, appetiteInputs } = form;

  useEffect(() => {
    const activeSettings = props.activeSettings;
    if (!activeSettings) return;
    setForm(getSetupForm(activeSettings));
  }, [props.activeSettings]);

  function updateAndSave(
    update: (current: MockDraftSetupForm) => MockDraftSetupForm
  ) {
    const next = update(form);
    setForm(next);
    saveMockDraftSetupPreferences(
      getMockDraftSetupPreferences(
        next.editableSettings,
        next.riskInputs,
        next.appetiteInputs
      )
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!props.onStart) return;
    const normalizedSettings = {
      ...editableSettings,
      positionRisk: normalizeRiskFactor(riskInputs.positionRisk),
      byeRisk: normalizeRiskFactor(riskInputs.byeRisk),
      craziness: normalizeRiskFactor(riskInputs.craziness),
      appetites: Object.fromEntries(
        APPETITE_POSITIONS.map((position) => [
          position,
          normalizeRiskFactor(appetiteInputs[position]),
        ])
      ) as MockDraftSettings["appetites"],
    };
    const resolved = {
      ...normalizedSettings,
      seed: normalizedSettings.seed.trim() || createSeed(),
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
    key: "draftPosition" | "teamCount",
    value: string
  ) {
    updateAndSave((current) => ({
      ...current,
      editableSettings: {
        ...current.editableSettings,
        [key]: Number(value),
      },
    }));
  }

  function setRiskFactor(key: RiskFactorKey, value: string) {
    updateAndSave((current) => ({
      ...current,
      riskInputs: { ...current.riskInputs, [key]: value },
    }));
  }

  return (
    <form className="mock-draft-setup" onSubmit={submit}>
      <div
        className="mock-draft-setup-header"
        data-testid="mock-draft-setup-header"
      >
        <div className="mock-draft-setup-title">mock draft</div>
        <button className="mock-draft-start" type="submit">
          mock draft
        </button>
      </div>
      <div
        className="mock-draft-fields mock-draft-primary-fields"
        data-testid="mock-draft-primary-fields"
      >
        <NumberField
          label="draft position"
          value={editableSettings.draftPosition}
          min={1}
          step={1}
          onChange={(value) => setNumber("draftPosition", value)}
        />
        <NumberField
          label="number of teams"
          value={editableSettings.teamCount}
          min={2}
          step={1}
          onChange={(value) => setNumber("teamCount", value)}
        />
        <NumberField
          label="position riskiness"
          value={riskInputs.positionRisk}
          min={0}
          step="any"
          onChange={(value) => setRiskFactor("positionRisk", value)}
        />
        <NumberField
          label="bye riskiness"
          value={riskInputs.byeRisk}
          min={0}
          step="any"
          onChange={(value) => setRiskFactor("byeRisk", value)}
        />
        <NumberField
          label="craziness"
          value={riskInputs.craziness}
          min={0}
          step="any"
          onChange={(value) => setRiskFactor("craziness", value)}
        />
        {APPETITE_POSITIONS.map((position) => (
          <NumberField
            key={position}
            label={`${position} appetite`}
            value={appetiteInputs[position]}
            min={0}
            step="any"
            onChange={(value) =>
              updateAndSave((current) => ({
                ...current,
                appetiteInputs: {
                  ...current.appetiteInputs,
                  [position]: value,
                },
              }))
            }
          />
        ))}
        <label className="mock-draft-field">
          <span>seed</span>
          <input
            aria-label="seed"
            value={editableSettings.seed}
            placeholder="random"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                editableSettings: {
                  ...current.editableSettings,
                  seed: event.target.value,
                },
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
            value={editableSettings.roster[slot]}
            min={0}
            step={1}
            onChange={(value) =>
              updateAndSave((current) => ({
                ...current,
                editableSettings: {
                  ...current.editableSettings,
                  roster: {
                    ...current.editableSettings.roster,
                    [slot]: Number(value),
                  },
                },
              }))
            }
          />
        ))}
      </div>
      {error ? <div className="mock-draft-error">{error}</div> : null}
    </form>
  );
}

function NumberField(props: {
  label: string;
  value: number | string;
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
  mode?: "mock" | "live";
  state: MockDraftState;
  playersById: Record<string, MockDraftDisplayPlayer>;
  orderedRanking: string[];
  onNudge: (pickIndex: number, direction: "better" | "worse") => void;
  onRechoose: (pickIndex: number) => void;
}) {
  const mode = props.mode ?? "mock";
  const [order, setOrder] = useState<"round" | "position">("round");
  const [failedImages, setFailedImages] = useState<Set<string>>(
    () => new Set()
  );
  const view = useMemo(
    () => getDraftView(props.state, props.playersById, props.orderedRanking),
    [props.state, props.playersById, props.orderedRanking]
  );
  const currentLabel =
    mode === "live"
      ? `${props.state.picks.length} picks`
      : view.complete
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
        <h2>{mode === "live" ? "live draft" : "mock draft"}</h2>
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

export function MockDraftRoster(props: {
  state: MockDraftState;
  playersById: Record<string, MockDraftDisplayPlayer>;
  orderedRanking: string[];
  onNudge: (pickIndex: number, direction: "better" | "worse") => void;
  onRechoose: (pickIndex: number) => void;
}) {
  const [failedImages, setFailedImages] = useState<Set<string>>(
    () => new Set()
  );
  const picks = useMemo(
    () =>
      getDraftView(props.state, props.playersById, props.orderedRanking)
        .picks.filter((pick) => pick.isUser)
        .sort((a, b) => {
          const aPlayer = props.playersById[a.playerId];
          const bPlayer = props.playersById[b.playerId];
          return (
            POSITION_ORDER.indexOf(normalizePosition(aPlayer.position)) -
              POSITION_ORDER.indexOf(normalizePosition(bPlayer.position)) ||
            a.pickIndex - b.pickIndex
          );
        }),
    [props.state, props.playersById, props.orderedRanking]
  );

  return (
    <aside
      className="mock-draft-my-players"
      data-testid="mock-draft-my-players"
      aria-label="my mock drafted players"
    >
      {picks.map((pick) => {
        const nudge = getHistoricalNudgeAvailability(
          props.state,
          pick.pickIndex,
          props.playersById,
          props.orderedRanking
        );
        return (
          <PickBubble
            key={pick.pickIndex}
            pick={pick}
            player={props.playersById[pick.playerId]}
            imageFailed={failedImages.has(pick.playerId)}
            canNudgeBetter={nudge.better}
            canNudgeWorse={nudge.worse}
            onImageError={() =>
              setFailedImages((current) =>
                new Set(current).add(pick.playerId)
              )
            }
            onNudge={props.onNudge}
            onRechoose={props.onRechoose}
          />
        );
      })}
    </aside>
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
  const live = props.mode === "live";
  const lastRound = Math.max(
    1,
    live
      ? Math.floor(props.state.picks.length / settings.teamCount) + 1
      : Math.min(
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
          const isUser = !live && draftPosition === settings.draftPosition;
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
                    canNudgeBetter={!live && nudge.better}
                    canNudgeWorse={!live && nudge.worse}
                    readOnly={live}
                    onImageError={() => props.onImageError(pick.playerId)}
                    onNudge={props.onNudge}
                    onRechoose={props.onRechoose}
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
  readOnly?: boolean;
  onImageError: () => void;
  onNudge: (pickIndex: number, direction: "better" | "worse") => void;
  onRechoose: (pickIndex: number) => void;
}) {
  const headshot = getEspnHeadshotUrl(props.player.id);
  const position = normalizePosition(props.player.position);
  return (
    <article
      className={`mock-draft-pick mock-draft-position-${position.toLowerCase()} ${
        props.pick.isUser ? "mock-draft-mine" : ""
      }`}
      style={{ backgroundColor: getPositionColor(position) }}
      data-mock-latest-round={props.latestRoundAnchor ? "true" : undefined}
    >
      <div className="mock-draft-player-top">
        <div className="mock-draft-player-visual">
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
          <span className="mock-draft-rank-controls">
            {props.readOnly ? (
              <span className="mock-draft-rank">#{props.pick.rank}</span>
            ) : (
              <>
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
                {props.pick.isUser ? (
                  <button
                    type="button"
                    className="mock-draft-rank mock-draft-rank-rechoose"
                    aria-label={`rechoose pick ${props.pick.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onRechoose(props.pick.pickIndex);
                    }}
                  >
                    #{props.pick.rank}
                  </button>
                ) : (
                  <span className="mock-draft-rank">#{props.pick.rank}</span>
                )}
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
              </>
            )}
          </span>
        </div>
        <div className="mock-draft-player-copy">
          <span className="mock-draft-pick-number">
            {props.pick.label}/{props.pick.pickIndex + 1}
          </span>
          <span className="mock-draft-composite-rank">
            {props.pick.compositeRank} ADP
          </span>
          <div className="mock-draft-player-name">
            {props.player.name}
            {props.player.rookie ? "*" : ""}
          </div>
          <div className="mock-draft-player-detail">
            <b className="mock-draft-player-position">{position}</b>
            <span className="mock-draft-player-bye">
              bye {props.player.byeWeek}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function getEspnHeadshotUrl(playerId: string): string | undefined {
  return Number(playerId) > 0
    ? `https://a.espncdn.com/i/headshots/nfl/players/full/${playerId}.png`
    : undefined;
}
