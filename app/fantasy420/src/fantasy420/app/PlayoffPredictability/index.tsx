import { useState } from "react";
import { printF } from "../Fetch";
import rawData from "./data.json";
import rawPredictabilities from "./predictabilities.json";

type DataType = {
  [year: string]: {
    [team: string]: {
      playoffs: number;
      primetimes: { [category: string]: number };
    };
  };
};

const data: DataType = rawData;
const allPredictabilities: { [year: string]: { [category: string]: number } } =
  rawPredictabilities;

function fetchData() {
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
  return Promise.resolve(Array.from(new Array(10)).map((_, i) => 2022 - i))
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
            rows
              .map((row) => ({
                teams: ["Winner/tie", "Loser/tie"].map(
                  (k) => row[k].split(" ").reverse()[0]
                ),
                isPlayoffs: isNaN(parseInt(row["Week"])),
                category:
                  row["Day"] !== "Sun"
                    ? row["Day"]
                    : row["Time"].startsWith("1:") ||
                      row["Time"].startsWith("4:")
                    ? "Sun"
                    : `${row["Day"]} ${row["Time"].split(":")[0]}${row[
                        "Time"
                      ].slice(-2)}`,
                row,
              }))
              .filter((row) => row.category !== "Sat")
              .filter((row) => row.category !== "Sun")
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
                    playoffs: matches.filter((match) => match.isPlayoffs)
                      .length,
                    primetimes: countStrings(
                      matches
                        .filter((match) => !match.isPlayoffs)
                        .map((match) => match.category)
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
  const predictabilities = allPredictabilities[year];
  const playoffs = Object.entries(yearData) // todo
    .map(([team, teamData]) => ({ team, teamData }))
    .filter((o) => o.teamData.playoffs)
    .map((o) => o.team);
  const prediction = Object.entries(yearData)
    .map(([team, teamData]) => ({
      team,
      score: Object.entries(teamData.primetimes)
        .map(([category, count]) => predictabilities[category] * count)
        .reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.score - b.score)
    .map((o) => o.team)
    .slice(-playoffs.length);
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
        <tbody>
          <tr>
            <td>playoff teams</td>
            <td>{playoffs.join(", ")}</td>
          </tr>
          <tr>
            <td>predicted playoff teams</td>
            <td>{prediction.join(", ")}</td>
          </tr>
          <tr>
            <td>predictabilities</td>
          </tr>
          {Object.entries(predictabilities).map(
            ([category, predictability]) => (
              <tr key={category}>
                <td>{category}</td>
                <td>{predictability.toFixed(2)}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
