import { playerGameContext } from "./playerContext";

const game = { awayProTeamId: 3, homeProTeamId: 1, date: 2000, statsOfficial: false };
const schedule = { settings: { proTeams: [
  { id: 3, abbrev: "CHI", byeWeek: 10, proGamesByScoringPeriod: { 6: [game] } },
  { id: 1, abbrev: "ATL", byeWeek: 11, proGamesByScoringPeriod: { 6: [game] } },
] } };
it("maps away/home opponents and the scheduled kickoff", () => {
  expect(playerGameContext(3, schedule, 6, 1000)).toEqual({ team: "CHI", opponent: "@ATL", status: "Scheduled", kickoff: 2000 });
  expect(playerGameContext(1, schedule, 6, 1000).opponent).toBe("vs CHI");
});
it("shows Started until stats are official without inventing a clock", () => {
  expect(playerGameContext(3, schedule, 6, 3000).status).toBe("Started");
  const final = structuredClone(schedule); final.settings.proTeams[0].proGamesByScoringPeriod[6][0].statsOfficial = true;
  expect(playerGameContext(3, final, 6, 3000).status).toBe("Final");
});
it("only labels an explicit bye and keeps missing schedule data unknown", () => {
  expect(playerGameContext(3, schedule, 10, 1000)).toMatchObject({ opponent: "BYE", status: "Bye", kickoff: null });
  expect(playerGameContext(3, schedule, 9, 1000).status).toBe("Unknown");
  expect(playerGameContext(undefined, schedule, 6, 1000).status).toBe("Unknown");
});
it("does not display a placeholder date as a confirmed TBD kickoff", () => {
  const tbd = { settings: { proTeams: [{ ...schedule.settings.proTeams[0], proGamesByScoringPeriod: { 6: [{ ...game, startTimeTBD: true }] } }, schedule.settings.proTeams[1]] } };
  expect(playerGameContext(3, tbd, 6, 3000)).toMatchObject({ status: "Scheduled", kickoff: null });
});
