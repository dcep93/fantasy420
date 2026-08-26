import { getCompositeForYear, getDraftForYear } from "./yearComposite";

test("returns only the composite belonging to the requested season", () => {
  const composite2023 = getCompositeForYear("2023");
  const composite2024 = getCompositeForYear("2024");

  expect(composite2023).toBeDefined();
  expect(composite2024).toBeDefined();

  const sharedPlayerWithDifferentRanks = Object.keys(composite2023!).find(
    (playerId) =>
      composite2024![playerId] !== undefined &&
      composite2024![playerId] !== composite2023![playerId]
  );
  expect(sharedPlayerWithDifferentRanks).toBeDefined();
});

test("does not borrow rankings for seasons without checked-in sources", () => {
  expect(getDraftForYear("2021")).toBeUndefined();
  expect(getDraftForYear("2022")).toBeUndefined();
  expect(getCompositeForYear("2021")).toBeUndefined();
  expect(getCompositeForYear("2022")).toBeUndefined();
  expect(getCompositeForYear("2026")).toBeDefined();
});
