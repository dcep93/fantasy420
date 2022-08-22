import {
  BoxscoreType,
  FieldGoalType,
  PlayerType,
  TeamType,
  WeekType,
  WrappedType,
} from ".";

function generateWrapped() {
  const year = 2021;
  const leagueIds = ["67201591", "203836968"];
  const numWeeks = 17;
  /* */
  function getWrapped(
    id: string
  ): Promise<{ id: string; wrapped: WrappedType }> {
    return getTeamNames(id)
      .then((teamNames) => {
        const players = {};
        return getWeeks(id, players).then((weeks) => ({
          teamNames,
          weeks,
          players,
        }));
      })
      .then((wrapped) => ({ id, wrapped }));
  }
  function sortByKey<T>(arr: T[], f: (t: T) => number): T[] {
    return arr
      .map((obj) => ({ obj, v: f(obj) }))
      .sort((a, b) => a.v - b.v)
      .map((w) => w.obj);
  }
  function getTeamNames(id: string): Promise<string[]> {
    return fetch(
      `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${id}?view=mTeam`
    )
      .then((resp) => resp.json())
      .then((resp) =>
        resp.teams.map((team: any) => `${team.location} ${team.nickname}`)
      );
  }
  function getWeeks(
    id: string,
    players: { [playerId: string]: PlayerType }
  ): Promise<WeekType[]> {
    function getTeam(rawTeam: any): TeamType {
      const proTeams: { [proTeamId: number]: string } = {
        0: "FA",
        1: "Atl",
        2: "Buf",
        3: "Chi",
        4: "Cin",
        5: "Cle",
        6: "Dal",
        7: "Den",
        8: "Det",
        9: "GB",
        10: "Ten",
        11: "Ind",
        12: "KC",
        13: "LV",
        14: "LAR",
        15: "Mia",
        16: "Min",
        17: "NE",
        18: "NO",
        19: "NYG",
        20: "NYJ",
        21: "Phi",
        22: "Ari",
        23: "Pit",
        24: "LAC",
        25: "SF",
        26: "Sea",
        27: "TB",
        28: "Wsh",
        29: "Car",
        30: "Jax",
        33: "Bal",
        34: "Hou",
      };
      const lineupInts: number[] = rawTeam.rosterForMatchupPeriod.entries
        .map((p: any) => p.playerId)
        .filter(
          (playerId: number) =>
            ![undefined, 20, 21].includes(
              rawTeam.rosterForCurrentScoringPeriod.entries.find(
                (p: any) => p.playerId === playerId
              )?.lineupSlotId
            )
        );
      const fullRoster: any[] = rawTeam.rosterForCurrentScoringPeriod.entries
        .map((rawPlayer: any) => ({
          rawPlayer,
          player: rawPlayer.playerPoolEntry.player,
        }))
        .map((obj: any) => ({
          id: obj.player.id,
          name: obj.player.fullName,
          score: obj.rawPlayer.playerPoolEntry.appliedStatTotal,
          position: obj.player.defaultPositionId,
          team: proTeams[obj.player.proTeamId].toUpperCase(),
        }));
      fullRoster.forEach((obj) => {
        players[obj.id] = {
          name: obj.name,
          position: obj.position,
          team: obj.team,
        };
      });
      const score = fullRoster
        .filter((p) => lineupInts.includes(p.id))
        .map((p) => p.score)
        .reduce((a, b) => a + b, 0);
      return {
        teamIndex: rawTeam.teamId - 1,
        score: score,
        lineup: lineupInts.map((i) => i.toString()),
        roster: Object.fromEntries(fullRoster.map((p: any) => [p.id, p.score])),
      };
    }
    function parseHTML(text: string) {
      return Promise.resolve(text).then((text) => {
        const newHTMLDocument =
          document.implementation.createHTMLDocument("preview");
        const html = newHTMLDocument.createElement("html");
        html.innerHTML = text;
        return html;
      });
    }
    function getGameId(team: string, weekNumber: number): Promise<string> {
      return fetch(`https://espn.com/nfl/team/schedule/_/name/${team}`)
        .then((resp) => resp.text())
        .then(parseHTML)
        .then((soup) => Array.from(soup.getElementsByTagName("table"))[0])
        .then(
          (table) =>
            Array.from(table.getElementsByTagName("tr")).find(
              (row) =>
                Array.from(row.getElementsByTagName("span"))[0].textContent ===
                weekNumber.toString()
            )!
        )
        .then((row) => Array.from(row.getElementsByTagName("a")))
        .then((hrefs) =>
          hrefs.length < 3
            ? ""
            : hrefs[2]
                .getAttribute("href")!
                .split("espn.com/nfl/game/_/gameId/")
                .reverse()[0]
        );
    }
    function getBoxscores(
      weekNumber: number,
      matches: TeamType[][]
    ): Promise<BoxscoreType[]> {
      /* TODO */
      return Promise.resolve([]);
    }
    function getFieldGoals(
      weekNumber: number,
      matches: TeamType[][]
    ): Promise<FieldGoalType[]> {
      const promises: Promise<FieldGoalType | undefined>[] = matches
        .flatMap((match) => match)
        .flatMap((team) => team.lineup)
        .map((playerId) => players[playerId])
        .filter((p) => p.position === 5) /* K */
        .map((p) => p.team)
        .map((team) =>
          getGameId(team, weekNumber).then((gameId) =>
            gameId === ""
              ? undefined
              : fetch(`https://espn.com/nfl/playbyplay/_/gameId/${gameId}`)
                  .then((resp) => resp.text())
                  .then(parseHTML)
                  .then((soup) => ({
                    team,
                    fieldgoals: Array.from(
                      soup.getElementsByClassName("headline")
                    )
                      .map((div) => div.textContent!)
                      .filter((text) => text.includes("Field Goal")),
                  }))
          )
        );
      return Promise.all(promises).then(
        (fieldgoals: (FieldGoalType | undefined)[]) =>
          fieldgoals.filter((fg) => fg !== undefined) as FieldGoalType[]
      );
    }
    const promises = Array.from(new Array(numWeeks)).map((_, weekNumber) =>
      fetch(
        `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${id}?view=mScoreboard&scoringPeriodId=${weekNumber}`
      )
        .then((resp) => resp.json())
        .then((resp) =>
          resp.schedule
            .filter(
              (rawMatch: any) => rawMatch.away.rosterForCurrentScoringPeriod
            )
            .map((rawMatch: any) =>
              sortByKey(
                [rawMatch.away, rawMatch.home].map(getTeam),
                (team) => team.score
              )
            )
        )
        .then((matches) => [
          matches,
          getBoxscores(weekNumber, matches),
          getFieldGoals(weekNumber, matches),
        ])
        .then((ps) => Promise.all(ps))
        .then(([matches, boxscores, fieldgoals]) => ({
          matches,
          number: weekNumber,
          boxscores,
          fieldgoals,
        }))
    );
    return Promise.all(promises);
  }
  Promise.all(leagueIds.map(getWrapped))
    .then((objs) => objs.map((obj) => [obj.id, obj.wrapped]))
    .then(Object.fromEntries)
    .then((allWrapped) => console.log(JSON.stringify(allWrapped)));
}

export default generateWrapped;
