import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { vi } from "vitest";

import { MockDraftPanel, MockDraftSetup } from "./MockDraftView";
import { DEFAULT_MOCK_DRAFT_SETTINGS } from "./mockDraft";

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

test("keeps active settings visible in two read-only rows with a copyable seed", () => {
  render(
    <MockDraftSetup
      activeSettings={{
        ...DEFAULT_MOCK_DRAFT_SETTINGS,
        seed: "copy-me",
      }}
    />
  );

  expect(screen.getByLabelText("draft position")).toBeDisabled();
  expect(screen.getByLabelText("QB slots")).toBeDisabled();
  expect(screen.getByLabelText("seed")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("seed")).not.toBeDisabled();
  expect(screen.getByLabelText("seed")).toHaveValue("copy-me");
  expect(screen.getByTestId("mock-draft-primary-fields")).toBeInTheDocument();
  expect(screen.getByTestId("mock-draft-roster-fields")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "mock draft" })).toBeNull();
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

test("keeps roster settings on one horizontally scrolling row", () => {
  const css = readFileSync(
    "src/fantasy420/app/Draft/MockDraftView.css",
    "utf8"
  );
  const rosterRule = css.match(/\.mock-draft-roster-fields\s*{([^}]*)}/)?.[1];

  expect(rosterRule).toMatch(/flex-wrap:\s*nowrap/);
  expect(rosterRule).toMatch(/overflow-x:\s*auto/);
});
