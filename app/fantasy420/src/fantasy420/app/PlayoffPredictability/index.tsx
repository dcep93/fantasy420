import MLR from "ml-regression-multivariate-linear";
import { useState } from "react";
import { printF } from "..";
import rawData from "./data.json";

type DataType = {
  [year: string]: {
    [team: string]: {
      wins: number;
      primetimes: { [category: string]: number };
    };
  };
};

const data: DataType = rawData;

function fetchData() {
  const historyYears = 10;
  function clog<T>(t: T) {
    console.error(t);
    return t;
  }
  function countStrings(arr: string[]): { [key: string]: number } {
    const c: { [key: string]: number } = {};
    arr.forEach((k) => {
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }
  return Promise.resolve(
    Array.from(new Array(historyYears)).map((_, i) => 2023 - i)
  )
    .then((years) =>
      years.map((year) =>
        fetch(`https://www.pro-football-reference.com/years/${year}/games.htm`)
          .then((resp) => resp.text())
          .then((rawHtml) =>
            new DOMParser().parseFromString(rawHtml, "text/html")
          )
          .then((html) => html.getElementById("games")!)
          .then((table) => {
            const headers = Array.from(
              table.getElementsByTagName("thead")[0].getElementsByTagName("th")
            ).map((th, i) => th.innerText || i.toString());
            return Array.from(
              table.getElementsByTagName("tbody")[0].getElementsByTagName("tr")
            )
              .filter((tr) => tr.className !== "thead")
              .map((tr) =>
                Object.fromEntries(
                  Array.from(tr.children).map((td, i) => [
                    headers[i],
                    (td as HTMLElement).innerText,
                  ])
                )
              );
          })
          .then((rows) =>
            rows.map((row) => ({
              teams: ["Winner/tie", "Loser/tie"].map(
                (k) => row[k].split(" ").reverse()[0]
              ),
              playoffs: isNaN(parseInt(row["Week"])),
              tie: row["PtsW"] === row["PtsL"],
              category:
                row["Day"] !== "Sun"
                  ? row["Day"]
                  : row["Time"].startsWith("1:") || row["Time"].startsWith("4:")
                  ? "Sun"
                  : `${row["Day"]} ${row["Time"].split(":")[0]}${row[
                      "Time"
                    ].slice(-2)}`,
              row,
            }))
          )
          .then((matches) =>
            Object.fromEntries(
              Object.keys(
                Object.fromEntries(
                  matches
                    .flatMap((match) => match.teams)
                    .map((team) => [team, 1])
                )
              )
                .filter((team) => team !== "")
                .map((team) => ({
                  team,
                  matches: matches.filter((match) =>
                    match.teams.includes(team)
                  ),
                }))
                .map(({ team, matches }) => [
                  team,
                  {
                    wins: matches
                      .map(
                        (match) =>
                          (match.tie
                            ? 0.5
                            : match.teams[0] === team
                            ? 1
                            : 0) as number
                      )
                      .reduce((a, b) => a + b, 0),
                    primetimes: countStrings(
                      matches
                        .filter((match) => !match.playoffs)
                        .map((match) => match.category)
                        .filter(
                          (category) => !["Sat", "Sun"].includes(category)
                        )
                    ),
                  },
                ])
            )
          )
          .then((yearData) => [year, yearData])
      )
    )
    .then((ps) => Promise.all(ps))
    .then((dataArr) => Object.fromEntries(dataArr))
    .then(clog);
}

export default function Index() {
  console.log(printF(fetchData));
  const defaultYear = Object.keys(data).sort().reverse()[0];
  const [year, updateYear] = useState(defaultYear);
  const yearData = data[year];
  const teams = Object.entries(yearData)
    .map(([team, teamData]) => ({ team, teamData }))
    .sort((a, b) => b.teamData.wins - a.teamData.wins)
    .map((o) => o.team);
  const primetimes = Object.keys(
    Object.fromEntries(
      Object.values(yearData)
        .flatMap((teamData) => Object.keys(teamData.primetimes))
        .map((category) => [category, 1])
    )
  );
  const x = teams.map((team) =>
    primetimes.map((category) => yearData[team].primetimes[category] || 0)
  );
  const y = teams.map((team) => [yearData[team].wins]);
  const mlr = new MLR(x, y);
  console.log(mlr);
  return (
    <div>
      <div>
        year:{" "}
        <select
          defaultValue={defaultYear}
          onChange={(e) => updateYear(e.target.value)}
        >
          {Object.keys(data).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <table>
        <thead>
          <tr>
            <th></th>
            {primetimes.concat(["wins"]).map((category) => (
              <th key={category} style={{ paddingRight: "40px" }}>
                {category}
              </th>
            ))}
            <th>predicted</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{"<weights>"}</td>
            {mlr.weights.slice(0, -1).map((weight, i) => (
              <td key={i}>{weight[0].toFixed(2)}</td>
            ))}
            <td>
              {mlr.weights.slice().reverse()[0][0].toFixed(2)} (intercept)
            </td>
            <td>{mlr.stdError.toFixed(2)} (stdError)</td>
          </tr>
          <tr>
            <td>_</td>
          </tr>
          {teams.map((team) => (
            <tr key={team}>
              <td>{team}</td>
              {primetimes.map((category) => (
                <td key={category}>
                  {yearData[team].primetimes[category] || 0}
                </td>
              ))}
              <td>{yearData[team].wins}</td>
              <td>
                {mlr
                  .predict(
                    primetimes.map(
                      (category) => yearData[team].primetimes[category] || 0
                    )
                  )[0]
                  .toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
