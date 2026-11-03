import { createElement } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import Wrapped, { wrappedModuleLabels, wrappedModules } from ".";
import allWrapped from "./allWrapped";

vi.mock("./tabs/AllYears", () => ({
  default: ({ seasons }: { seasons: Record<string, unknown> }) =>
    createElement("div", { "data-testid": "report-years" }, Object.keys(seasons).join(",")),
}));
vi.mock("./tabs/PlayerStats", () => ({ default: () => createElement("div", null, "Player history") }));
vi.mock("./tabs/ManagerPlot", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

for (const tab of ["HeadToHead", "Simps", "PlayerStats"]) {
  test.each(["2025", "2026", "all", "bogus", null])(`${tab} always uses all years with query year %s`, (year) => {
    window.history.replaceState(null, "", `/${year ? `?year=${year}` : ""}#${tab}`);
    render(createElement(Wrapped));
    expect(screen.queryByLabelText("Year:")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("All years");
    if (tab !== "PlayerStats") {
      expect(screen.getByTestId("report-years").textContent).toBe(Object.keys(allWrapped).join(","));
    }
  });
}

test("restores the selected season when leaving an all-years-only tab", () => {
  window.history.replaceState(null, "", "/?year=2025#HeadToHead");
  render(createElement(Wrapped));
  act(() => {
    window.history.replaceState(null, "", "/?year=2025#ManagerPlot");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  expect(screen.getByLabelText("Year:")).toHaveValue("2025");
  act(() => {
    window.history.replaceState(null, "", "/?year=2024#Simps");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  expect(screen.queryByLabelText("Year:")).not.toBeInTheDocument();
  expect(screen.getByTestId("report-years").textContent).toBe(Object.keys(allWrapped).join(","));
});

test("places ReachesAndSteals immediately after DraftBoard", () => {
  const moduleNames = Object.keys(wrappedModules);
  const draftBoardIndex = moduleNames.indexOf("DraftBoard");

  expect(moduleNames[draftBoardIndex + 1]).toBe("ReachesAndSteals");
  expect(moduleNames).not.toContain("DraftDayReachesAndSteals");
  expect(wrappedModuleLabels.ReachesAndSteals).toBe("ReachesAndSteals");
});
