import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { vi } from "vitest";

import {
  MockDraftPanel,
  MockDraftRoster,
  MockDraftSetup,
} from "./MockDraftView";
import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";
import { POSITION_COLORS } from "./positionColors";

test("renders the requested setup defaults and customizable roster", () => {
  render(<MockDraftSetup onStart={vi.fn()} />);

  expect(screen.getByLabelText("draft position")).toHaveValue(8);
  expect(screen.getByLabelText("number of teams")).toHaveValue(10);
  expect(screen.getByLabelText("position riskiness")).toHaveValue(1);
  expect(screen.getByLabelText("bye riskiness")).toHaveValue(1);
  expect(screen.getByLabelText("craziness")).toHaveValue(1);
  expect(screen.getByLabelText("QB appetite")).toHaveValue(1);
  expect(screen.getByLabelText("RB appetite")).toHaveValue(1);
  expect(screen.getByLabelText("WR appetite")).toHaveValue(1);
  expect(screen.getByLabelText("TE appetite")).toHaveValue(1);
  expect(screen.getByLabelText("seed")).toHaveValue("");
  expect(screen.getByLabelText("QB slots")).toHaveValue(1);
  expect(screen.getByLabelText("FLEX slots")).toHaveValue(2);
  expect(screen.getByLabelText("SUPERFLEX slots")).toHaveValue(1);
  expect(screen.getByLabelText("DST slots")).toHaveValue(0);
  expect(screen.queryByLabelText("K slots")).not.toBeInTheDocument();
  expect(screen.getByLabelText("BENCH slots")).toHaveValue(2);
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
  fireEvent.change(screen.getByLabelText("QB appetite"), {
    target: { value: "0" },
  });
  fireEvent.change(screen.getByLabelText("TE appetite"), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByRole("button", { name: "mock draft" }));

  expect(onStart.mock.calls[0][0]).toMatchObject({
    positionRisk: 0.0001,
    byeRisk: 10000,
    craziness: 10000,
    appetites: { QB: 0.0001, RB: 1, WR: 1, TE: 10000 },
  });
});

test("keeps pending settings editable without restarting until submit", () => {
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

  expect(screen.getByLabelText("draft position")).toBeEnabled();
  expect(screen.getByLabelText("QB slots")).toBeEnabled();
  expect(screen.getByLabelText("seed")).toBeEnabled();
  expect(screen.getByLabelText("seed")).not.toHaveAttribute("readonly");
  expect(screen.getByLabelText("seed")).toHaveValue("copy-me");
  expect(screen.getByTestId("mock-draft-primary-fields")).toBeInTheDocument();
  expect(screen.getByTestId("mock-draft-roster-fields")).toBeInTheDocument();
  const action = screen.getByRole("button", { name: "mock draft" });
  expect(action).toBeEnabled();
  expect(screen.getByTestId("mock-draft-setup-header")).toContainElement(action);

  fireEvent.change(screen.getByLabelText("draft position"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("position riskiness"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("seed"), {
    target: { value: "next-seed" },
  });
  fireEvent.change(screen.getByLabelText("QB slots"), {
    target: { value: "2" },
  });

  expect(onStart).not.toHaveBeenCalled();
  fireEvent.click(action);

  expect(onStart).toHaveBeenCalledOnce();
  expect(onStart.mock.calls[0][0]).toEqual({
    ...activeSettings,
    draftPosition: 4,
    positionRisk: 2,
    seed: "next-seed",
    roster: { ...activeSettings.roster, QB: 2 },
  });
});

test("resets pending settings only when active settings change", () => {
  const first = { ...DEFAULT_MOCK_DRAFT_SETTINGS, seed: "first" };
  const rendered = render(<MockDraftSetup activeSettings={first} />);

  fireEvent.change(screen.getByLabelText("craziness"), {
    target: { value: "9" },
  });
  rendered.rerender(<MockDraftSetup activeSettings={first} />);
  expect(screen.getByLabelText("craziness")).toHaveValue(9);

  const navigated = { ...first, craziness: 3, seed: "navigated" };
  rendered.rerender(<MockDraftSetup activeSettings={navigated} />);
  expect(screen.getByLabelText("craziness")).toHaveValue(3);
  expect(screen.getByLabelText("seed")).toHaveValue("navigated");
});

test("renders derived headshots, rookie marks, fallback, and nudge controls", () => {
  const onNudge = vi.fn();
  const onRechoose = vi.fn();
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
      onRechoose={onRechoose}
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
  expect(screen.queryByLabelText("rechoose pick 1.01")).not.toBeInTheDocument();
  expect(screen.getByLabelText("rechoose pick 1.02")).toHaveTextContent("#1");
  expect(screen.getByText("1.01/1")).toBeInTheDocument();
  expect(screen.getByText("1 ADP")).toBeInTheDocument();
  expect(screen.getByText("2 ADP")).toBeInTheDocument();
  const gibbsBubble = screen
    .getByText("Jahmyr Gibbs*")
    .closest(".mock-draft-pick")!;
  expect(gibbsBubble).toHaveClass("mock-draft-position-rb");
  const visual = gibbsBubble.querySelector(".mock-draft-player-visual")!;
  const copy = gibbsBubble.querySelector(".mock-draft-player-copy")!;
  expect(visual).toContainElement(
    screen.getByRole("img", { name: "Jahmyr Gibbs" })
  );
  expect(visual).toContainElement(
    screen
      .getByLabelText("make pick 1.01 better")
      .closest(".mock-draft-rank-controls")
  );
  expect(Array.from(copy.children).map((child) => child.className)).toEqual([
    "mock-draft-pick-number",
    "mock-draft-composite-rank",
    "mock-draft-player-name",
    "mock-draft-player-detail",
  ]);
  const detail = gibbsBubble.querySelector(".mock-draft-player-detail")!;
  expect(Array.from(detail.children).map((child) => child.textContent)).toEqual([
    "RB",
    "bye 8",
  ]);

  fireEvent.click(screen.getByLabelText("make pick 1.01 worse"));
  expect(onNudge).toHaveBeenCalledWith(0, "worse");
  fireEvent.click(screen.getByLabelText("rechoose pick 1.02"));
  expect(onRechoose).toHaveBeenCalledWith(1);
  expect(screen.getByTestId("mock-draft-panel")).toHaveAttribute(
    "data-order",
    "round"
  );
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
      onRechoose={vi.fn()}
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
      onRechoose={vi.fn()}
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

test("shows only user picks in a full roster column ordered by position and pick", () => {
  const positions = [
    "TE",
    "WR",
    "K",
    "DST",
    "QB",
    "RB",
    "TE",
    "WR",
    "K",
    "DST",
    "RB",
  ];
  const playersById = Object.fromEntries(
    positions.map((position, index) => [
      String(index + 1),
      {
        id: String(index + 1),
        name:
          index === 1
            ? "First Receiver"
            : index === 4
            ? "My Quarterback"
            : index === 7
            ? "Second Receiver"
            : index === 10
            ? "My Runner"
            : `Opponent ${index + 1}`,
        position,
        byeWeek: 7,
        rookie: false,
      },
    ])
  );
  const playerIds = Object.keys(playersById);

  render(
    <MockDraftRoster
      state={{
        settings: {
          ...DEFAULT_MOCK_DRAFT_SETTINGS,
          teamCount: 3,
          draftPosition: 2,
          seed: "my-roster",
        },
        picks: playerIds,
      }}
      playersById={playersById}
      orderedRanking={playerIds}
      onNudge={vi.fn()}
      onRechoose={vi.fn()}
    />
  );

  const roster = screen.getByTestId("mock-draft-my-players");
  expect(Array.from(roster.children).map((card) => card.textContent)).toEqual([
    expect.stringContaining("My Quarterback"),
    expect.stringContaining("My Runner"),
    expect.stringContaining("First Receiver"),
    expect.stringContaining("Second Receiver"),
  ]);
  expect(roster).not.toHaveTextContent("Opponent");
  expect(roster.querySelectorAll(":scope > .mock-draft-pick")).toHaveLength(4);
  expect(roster.querySelectorAll(":scope > .mock-draft-mine")).toHaveLength(4);
  expect(roster.querySelectorAll(".mock-draft-rank-controls")).toHaveLength(4);
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
      onRechoose={vi.fn()}
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

test("keeps setup settings in a capped responsive grid", () => {
  const css = readFileSync(
    "src/fantasy420/app/Draft/MockDraftView.css",
    "utf8"
  );
  const setupRule = css.match(/\.mock-draft-setup\s*{([^}]*)}/)?.[1];
  const fieldsRule = css.match(/\.mock-draft-fields\s*{([^}]*)}/)?.[1];
  const rosterRule = css.match(/\.mock-draft-roster-fields\s*{([^}]*)}/)?.[1];

  expect(setupRule).toMatch(/width:\s*min\(100%,\s*1000px\)/);
  expect(fieldsRule).toMatch(/display:\s*grid/);
  expect(fieldsRule).toMatch(
    /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/
  );
  expect(rosterRule).not.toMatch(/overflow-x/);
  expect(css).toMatch(
    /@media \(max-width:\s*800px\)[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
  );
  expect(css).toMatch(
    /@media \(max-width:\s*500px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/
  );
});

test("gives the rankings workspace a full viewport and scrolls the table internally", () => {
  const css = readFileSync(
    "src/fantasy420/app/Draft/MockDraftView.css",
    "utf8"
  );
  const workspaceRule = css.match(/\.draft-rankings-workspace\s*{([^}]*)}/)?.[1];
  const scrollerRule = css.match(/\.mock-draft-player-scroller\s*{([^}]*)}/)?.[1];

  expect(workspaceRule).toMatch(/height:\s*100vh/);
  expect(scrollerRule).toMatch(/height:\s*100%/);
  expect(scrollerRule).toMatch(/overflow:\s*auto/);
});

test("keeps bright bubbles and rank controls readable", () => {
  const css = readFileSync(
    "src/fantasy420/app/Draft/MockDraftView.css",
    "utf8"
  );
  const filledBubbleRule = css.match(
    /\.mock-draft-pick:not\(\.mock-draft-empty\)\s*{([^}]*)}/
  )?.[1];
  const rankControlsRule = css.match(
    /\.mock-draft-rank-controls\s*{([^}]*)}/
  )?.[1];
  const rankRule = css.match(/\.mock-draft-rank\s*{([^}]*)}/)?.[1];
  const playerTopRule = css.match(
    /\.mock-draft-player-top\s*{([^}]*)}/
  )?.[1];
  const detailRule = css.match(
    /\.mock-draft-player-detail\s*{([^}]*)}/
  )?.[1];

  expect(filledBubbleRule).toMatch(/color:\s*#17100d/);
  expect(rankControlsRule).toMatch(/background:\s*#5a3523/);
  expect(rankRule).toMatch(/color:\s*#fff7ed/);
  expect(playerTopRule).toMatch(/display:\s*grid/);
  expect(playerTopRule).toMatch(/grid-template-columns:/);
  expect(detailRule).toMatch(/display:\s*grid/);
  expect(detailRule).toMatch(/color:\s*#17100d/);
  expect(detailRule).toMatch(/font-weight:\s*600/);
});
