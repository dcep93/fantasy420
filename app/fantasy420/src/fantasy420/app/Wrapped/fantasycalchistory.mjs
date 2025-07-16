import simpleGit from "simple-git";

function promiseReduce(arr, promiseF) {
  const data = [];
  function helper() {
    if (arr.length === 0) return Promise.resolve(data);
    return Promise.resolve()
      .then(() => arr.shift())
      .then(promiseF)
      .then((obj) => data.push(obj))
      .then(helper)
      .catch((err) => data);
  }
  return helper();
}

const git = simpleGit();
Promise.resolve()
  .then(() => git.log())
  .then((log) => log.all)
  .then((log) =>
    promiseReduce(log, (commit) =>
      Promise.resolve()
        .then(() => git.show([`${commit.hash}:./2025.json`]))
        .then(JSON.parse)
        .then((obj) => ({
          values: Object.fromEntries(
            Object.values(obj.ffTeams).map((team) => [
              team.id,
              parseFloat(
                team.rosters["0"].rostered
                  .map((playerId) => obj.fantasyCalc.players[playerId] || 0)
                  .reduce((a, b) => a + b, 0)
                  .toFixed(2)
              ),
            ])
          ),
          date: new Date(commit.date).getTime(),
        }))
    )
  )
  .then((data) =>
    data.reverse().filter((d) => Object.values(d.values).length === 10)
  )
  .then((data) =>
    data
      .slice(0, -1)
      .filter(
        (d, i) =>
          JSON.stringify(d.values) !== JSON.stringify(data[i + 1].values)
      )
  )
  .then((data) => JSON.stringify(data, null, 2))
  .then((data) => console.log(data));
