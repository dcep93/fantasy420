import getMidranks from "./midrank";

test("keeps zero-based ranks for unique values", () => {
  expect(getMidranks({ third: 30, first: 10, second: 20 })).toEqual({
    first: 0,
    second: 1,
    third: 2,
  });
});

test("assigns tied auction prices their shared midpoint rank", () => {
  expect(
    getMidranks({ elite: -50, oneA: -1, oneB: -1, zeroA: 0, zeroB: 0, zeroC: 0 })
  ).toEqual({
    elite: 0,
    oneA: 1.5,
    oneB: 1.5,
    zeroA: 4,
    zeroB: 4,
    zeroC: 4,
  });
});
