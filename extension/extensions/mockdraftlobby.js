const PICK_NUMBER = 2;

const LOOP_PERIOD_MS = 1000;

function main() {
  if (window.top === window.self) loop();
}

function loop() {
  Promise.all(
    Array.from(
      Array.from(document.getElementsByTagName("table") || [])
        .reverse()[0]
        ?.getElementsByTagName("tr") || []
    )
      .map((tr) => tr?.getElementsByTagName("a")[0])
      .filter((a) => a)
      .filter((a) => {
        if (a.innerText.match(/10-Team H2H Points PPR Mock$/)) {
          return true;
        }
        a.style.border = "";
        return false;
      })
      .map(
        (a) =>
          new Promise((resolve) =>
            fetch(
              `https://fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/${
                a.href.split("=")[1]
              }?view=mSettings&view=mTeam&view=modular&view=mNav`
            )
              .then((resp) => resp.json())
              .then((json) => resolve({ json, a }))
          )
      )
  )
    .then((objs) =>
      objs
        .filter((obj) => {
          if (
            obj.json.teams[PICK_NUMBER - 1].nickname === PICK_NUMBER.toString()
          ) {
            return true;
          }
          obj.a.style.border = "2px solid red";
          return false;
        })
        .map((obj) => obj.a)
        .forEach((a) => (a.style.border = "2px solid black"))
    )
    .then(() => setTimeout(loop, LOOP_PERIOD_MS));
}

main();
