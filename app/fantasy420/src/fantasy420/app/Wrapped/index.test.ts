import { wrappedModuleLabels, wrappedModules } from ".";

test("places ReachesAndSteals immediately after DraftBoard", () => {
  const moduleNames = Object.keys(wrappedModules);
  const draftBoardIndex = moduleNames.indexOf("DraftBoard");

  expect(moduleNames[draftBoardIndex + 1]).toBe("ReachesAndSteals");
  expect(moduleNames).not.toContain("DraftDayReachesAndSteals");
  expect(wrappedModuleLabels.ReachesAndSteals).toBe("ReachesAndSteals");
});
