import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { vi } from "vitest";

import { MockDraftPanel, MockDraftSetup } from "./MockDraftView";
import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";
import { POSITION_COLORS } from "./positionColors";

test("renders the requested setup defaults and customizable roster", () => {
  render(<MockDraftSetup onStart={vi.fn()} />);

  expect(screen.getByLabelText("draft position")).toHaveValue(8);
  expect(screen.getByLabelText("number of teams")).toHaveValue(10);
  expect(screen.getByLabelText("position riskiness")).toHaveValue(1);
  expect(screen.getByLabelText("bye riskiness")).toHaveValue(1);
  expect(screen.getByLabelText("craziness")).toHaveValue(1);
  expect(screen.getByLabelText("seed")).toHaveValue("");
  expect(screen.getByLabelText("QB slots")).toHaveValue(1);
  expect(screen.getByLabelText("FLEX slots")).toHaveValue(2);
  expect(screen.getByLabelText("SUPERFLEX slots")).toHaveValue(1);
  expect(screen.getByLabelText("BENCH slots")).toHaveValue(5);
});

test("resolves a blank seed and starts with edited settings", () => {
  const onStart = vi.fn();
  render(<MockDraftSetup onStart={onStart} />);
  fireEvent.change(screen.getByLabelText("number of teams"), {
    target: { value: "12" },
  });
  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));

  expect(onStart).toHaveBeenCalledOnce();
  expect(onStart.mock.calls[0][0].teamCount).toBe(12);
  expect(onStart.mock.calls[0][0].seed).not.toBe("");
});

test("normalizes factor input extremes when starting", () => {
  const onStart = vi.fn();
  render(<MockDraftSetup onStart={onStart} />);

  fireEvent.change(screen.getByLabelText("position riskiness"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("bye riskiness"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText("craziness"), {
    target: { value: "20000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));

  expect(onStart.mock.calls[0][0]).toMatchObject({
    positionRisk: 0.0001,
    byeRisk: 10000,
    craziness: 10000,
  });
});

test("keeps active settings visible in two read-only rows with a copyable seed", () => {
  const onStart = vi.fn();
  const activeSettings = {
    ...DEFAULT_MOCK_DRAFT_SETTINGS,
    seed: "copy-me",
  };
  render(
    <MockDraftSetup
      activeSettings={activeSettings}
      onStart={onStart}
    />
  );

  expect(screen.getByLabelText("draft position")).toBeDisabled();
  expect(screen.getByLabelText("QB slots")).toBeDisabled();
  expect(screen.getByLabelText("seed")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("seed")).not.toBeDisabled();
  expect(screen.getByLabelText("seed")).toHaveValue("copy-me");
  expect(screen.getByTestId("mock-draft-primary-fields")).toBeInTheDocument();
  expect(screen.getByTestId("mock-draft-roster-fields")).toBeInTheDocument();
  const action = screen.getByRole("button", { name: "mock draft" });
  expect(action).toBeEnabled();
  expect(screen.getByTestId("mock-draft-setup-header")).toContainElement(action);

  fireEvent.click(action);

  expect(onStart).toHaveBeenCalledOnce();
  expect(onStart.mock.calls[0][0]).toEqual({
    ...activeSettings,
    seed: expect.any(String),
  });
  expect(onStart.mock.calls[0][0].seed).not.toBe("copy-me");
});

test("renders derived headshots, rookie marks, fallback, and nudge controls", () => {
  const onNudge = vi.fn();
  render(
    <MockDraftPanel
      state={{
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 2,
          draftPosition: 2,
          seed: "board",
          roster: {
            QB: 1,
            RB: 0,
            WR: 0,
            TE: 0,
            FLEX: 0,
            SUPERFLEX: 0,
            DST: 0,
            K: 0,
            BENCH: 0,
          },
        },
        picks: ["4429795", "-16008"],
      }}
      playersById={{
        "4429795": {
          id: "4429795",
          name: "Jahmyr Gibbs",
          position: "RB",
          byeWeek: 8,
          rookie: true,
        },
        "-16008": {
          id: "-16008",
          name: "Lions D/ST",
          position: "DST",
          byeWeek: 8,
          rookie: false,
        },
      }}
      orderedRanking={["4429795", "-16008"]}
      onNudge={onNudge}
    />
  );

  expect(screen.getByText("Jahmyr Gibbs*")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Jahmyr Gibbs" })).toHaveAttribute(
    "src",
    "https://a.espncdn.com/i/headshots/nfl/players/full/4429795.png"
  );
  expect(screen.getByLabelText("Lions D/ST image fallback")).toBeInTheDocument();
  expect(screen.getAllByText("#1")).toHaveLength(2);
  expect(screen.getByLabelText("make pick 1.01 better")).toBeDisabled();
  expect(screen.getByLabelText("make pick 1.02 worse")).toBeDisabled();
  expect(screen.getByText("1.01/1")).toBeInTheDocument();
  expect(
    screen.getByText("Jahmyr Gibbs*").closest(".mock-draft-pick")
  ).toHaveClass("mock-draft-position-rb");

  fireEvent.click(screen.getByLabelText("make pick 1.01 worse"));
  expect(onNudge).toHaveBeenCalledWith(0, "worse");
});

test("uses the table's bright position palette for draft bubbles", () => {
  render(
    <MockDraftPanel
      state={{
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 3,
          draftPosition: 2,
          seed: "palette",
        },
        picks: ["1", "2", "-3"],
      }}
      playersById={{
        "1": {
          id: "1",
          name: "Running Back",
          position: "RB",
          byeWeek: 7,
          rookie: false,
        },
        "2": {
          id: "2",
          name: "Wide Receiver",
          position: "WR",
          byeWeek: 8,
          rookie: false,
        },
        "-3": {
          id: "-3",
          name: "Defense",
          position: "DST",
          byeWeek: 9,
          rookie: false,
        },
      }}
      orderedRanking={["1", "2", "-3"]}
      onNudge={vi.fn()}
    />
  );

  expect(
    (screen.getByText("Running Back").closest(".mock-draft-pick") as HTMLElement)
      .style.backgroundColor
  ).toBe(POSITION_COLORS.RB);
  expect(
    (screen.getByText("Wide Receiver").closest(".mock-draft-pick") as HTMLElement)
      .style.backgroundColor
  ).toBe(POSITION_COLORS.WR);
  expect(
    (screen.getByText("Defense").closest(".mock-draft-pick") as HTMLElement)
      .style.backgroundColor
  ).toBe(POSITION_COLORS.DST);
  expect(POSITION_COLORS.DST).toBe(POSITION_COLORS["D/ST"]);
});

test("keeps team columns fixed and toggles every column together", () => {
  render(
    <MockDraftPanel
      state={{
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 3,
          draftPosition: 2,
          seed: "board",
        },
        picks: ["4", "2", "6", "1", "5", "3"],
      }}
      playersById={{
        "1": { id: "1", name: "Quarterback", position: "QB", byeWeek: 7, rookie: false },
        "2": { id: "2", name: "Runner", position: "RB", byeWeek: 8, rookie: false },
        "3": { id: "3", name: "Receiver", position: "WR", byeWeek: 9, rookie: false },
        "4": { id: "4", name: "Team One Tight End", position: "TE", byeWeek: 10, rookie: false },
        "5": { id: "5", name: "User Quarterback", position: "QB", byeWeek: 11, rookie: false },
        "6": { id: "6", name: "Team Three Tight End", position: "TE", byeWeek: 12, rookie: false },
      }}
      orderedRanking={["1", "2", "3", "4", "5", "6"]}
      onNudge={vi.fn()}
    />
  );

  const columns = [1, 2, 3].map((team) =>
    screen.getByTestId(`mock-draft-team-${team}`)
  );
  const [teamOneColumn, userColumn, teamThreeColumn] = columns;
  expect(columns.map((column) => column.dataset.order)).toEqual([
    "round",
    "round",
    "round",
  ]);
  expect(teamOneColumn.textContent!.indexOf("Team One Tight End")).toBeLessThan(
    teamOneColumn.textContent!.indexOf("Receiver")
  );
  expect(userColumn.textContent!.indexOf("Runner")).toBeLessThan(
    userColumn.textContent!.indexOf("User Quarterback")
  );
  expect(
    teamThreeColumn.textContent!.indexOf("Team Three Tight End")
  ).toBeLessThan(teamThreeColumn.textContent!.indexOf("Quarterback"));

  fireEvent.click(screen.getByTestId("mock-draft-panel"));

  expect(columns.map((column) => column.dataset.order)).toEqual([
    "position",
    "position",
    "position",
  ]);
  expect(teamOneColumn.textContent!.indexOf("Receiver")).toBeLessThan(
    teamOneColumn.textContent!.indexOf("Team One Tight End")
  );
  expect(userColumn.textContent!.indexOf("User Quarterback")).toBeLessThan(
    userColumn.textContent!.indexOf("Runner")
  );
  expect(teamThreeColumn.textContent!.indexOf("Quarterback")).toBeLessThan(
    teamThreeColumn.textContent!.indexOf("Team Three Tight End")
  );
});

test("shows the total pick index and preserves it as the position tie-breaker", () => {
  const playerIds = Array.from({ length: 21 }, (_, index) => String(index + 1));
  const playersById = Object.fromEntries(
    playerIds.map((id) => [
      id,
      {
        id,
        name: `Player ${id}`,
        position: "QB",
        byeWeek: 7,
        rookie: false,
      },
    ])
  );
  render(
    <MockDraftPanel
      state={{
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 10,
          draftPosition: 8,
          seed: "total-picks",
        },
        picks: playerIds,
      }}
      playersById={playersById}
      orderedRanking={playerIds}
      onNudge={vi.fn()}
    />
  );

  expect(screen.getByText("3.01/21")).toBeInTheDocument();

  const teamOne = screen.getByTestId("mock-draft-team-1");
  fireEvent.click(screen.getByTestId("mock-draft-panel"));
  expect(teamOne.textContent!.indexOf("Player 1")).toBeLessThan(
    teamOne.textContent!.indexOf("Player 20")
  );
  expect(teamOne.textContent!.indexOf("Player 20")).toBeLessThan(
    teamOne.textContent!.indexOf("Player 21")
  );
});

test("keeps roster settings on one horizontally scrolling row", () => {
  const css = readFileSync(
    "src/fantasy420/app/Draft/MockDraftView.css",
    "utf8"
  );
  const rosterRule = css.match(/\.mock-draft-roster-fields\s*{([^}]*)}/)?.[1];

  expect(rosterRule).toMatch(/flex-wrap:\s*nowrap/);
  expect(rosterRule).toMatch(/overflow-x:\s*auto/);
});
