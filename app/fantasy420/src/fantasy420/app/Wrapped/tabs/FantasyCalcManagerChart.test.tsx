import { fireEvent, render, screen, within } from "@testing-library/react";
import FantasyCalcManagerChart from "./FantasyCalcManagerChart";

const teams = [
  { id: "a", name: "Alpha", value: 100, ps: [
    { id: "1", name: "First Last", value: 75, draftPick: 0 },
    { id: "2", name: "Second", value: 25 },
    { id: "3", name: "Zero", value: 0 },
  ] },
  { id: "b", name: "Beta", value: 50, ps: [
    { id: "4", name: "Fourth", value: 50, draftPick: 14 },
  ] },
];

test("shows player names in proportional segments while keeping score and draft details hidden", () => {
  render(<FantasyCalcManagerChart teams={teams} available />);
  expect(screen.getByRole("group", { name: "Alpha: 100.00" })).toHaveStyle({ width: "100%" });
  expect(screen.getByRole("group", { name: "Beta: 50.00" })).toHaveStyle({ width: "50%" });
  expect(screen.getByRole("button", { name: "Alpha, First Last" })).toHaveStyle({ width: "75%" });
  expect(within(screen.getByRole("button", { name: "Alpha, First Last" })).getByText("First")).toBeVisible();
  expect(within(screen.getByRole("button", { name: "Alpha, First Last" })).getByText("Last")).toBeVisible();
  expect(screen.queryByRole("region", { name: "Player details" })).not.toBeInTheDocument();
});

test("keyboard focus reveals one-based draft picks and Escape dismisses details", () => {
  render(<FantasyCalcManagerChart teams={teams} available />);
  fireEvent.focus(screen.getByRole("button", { name: "Alpha, First Last" }));
  expect(screen.getByText("75.00 · Draft pick #1")).toBeVisible();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("region", { name: "Player details" })).not.toBeInTheDocument();
});

test("hover reveals details and mouse leave clears unpinned details", () => {
  render(<FantasyCalcManagerChart teams={teams} available />);
  const segment = screen.getByRole("button", { name: "Alpha, First Last" });
  const enter = new MouseEvent("pointerover", { bubbles: true });
  Object.defineProperty(enter, "pointerType", { value: "mouse" });
  fireEvent(segment, enter);
  expect(within(screen.getByRole("region", { name: "Player details" })).getByText("First Last")).toBeVisible();
  const leave = new MouseEvent("pointerout", { bubbles: true });
  Object.defineProperty(leave, "pointerType", { value: "mouse" });
  fireEvent(segment, leave);
  expect(screen.queryByRole("region", { name: "Player details" })).not.toBeInTheDocument();
});

test("tap pins details, next reaches undrafted and zero-value players, and outside tap dismisses", () => {
  render(<FantasyCalcManagerChart teams={teams} available />);
  const segment = screen.getByRole("button", { name: "Alpha, First Last" });
  fireEvent.click(segment);
  fireEvent.pointerLeave(segment);
  expect(within(screen.getByRole("region", { name: "Player details" })).getByText("First Last")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next player" }));
  expect(screen.getByText("25.00 · Undrafted")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next player" }));
  expect(screen.getByText("Zero")).toBeVisible();
  expect(screen.getByText("0.00 · Undrafted")).toBeVisible();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByText("Zero")).not.toBeInTheDocument();
});

test("keyboard focus can change the selected player after a pinned tap", () => {
  render(<FantasyCalcManagerChart teams={teams} available />);
  fireEvent.click(screen.getByRole("button", { name: "Alpha, First Last" }));
  fireEvent.focus(screen.getByRole("button", { name: "Beta, Fourth" }));
  expect(screen.getByText("50.00 · Draft pick #15")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Close player details" }));
  expect(screen.queryByRole("region", { name: "Player details" })).not.toBeInTheDocument();
});

test("zero total rosters remain inspectable and missing data has an empty state", () => {
  const { rerender } = render(<FantasyCalcManagerChart teams={[
    { id: "z", name: "Zero team", value: 0, ps: [{ id: "z1", name: "Zero player", value: 0 }] },
    { id: "e", name: "Empty", value: 0, ps: [] },
  ]} available />);
  expect(screen.getByText("No rostered players")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Inspect roster/ }));
  expect(within(screen.getByRole("region", { name: "Player details" })).getByText("Zero player")).toBeVisible();
  rerender(<FantasyCalcManagerChart teams={[]} available={false} />);
  expect(screen.getByText("FantasyCalc values are unavailable for this season.")).toBeVisible();
  expect(screen.queryByRole("region", { name: "Player details" })).not.toBeInTheDocument();
});
