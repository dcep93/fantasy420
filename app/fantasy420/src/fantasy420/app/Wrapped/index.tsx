import { ReactNode, useState } from "react";
import { printF } from "../Fetch";
import FetchWrapped, { WrappedType } from "./FetchWrapped";
import rawWrapped from "./wrapped.json";

export const wrapped: WrappedType = rawWrapped;

export default function Wrapped() {
  document.title = "Fantasy Wrapped";
  const toRender: { [key: string]: () => ReactNode } = {
    SqueezesAndStomps,
    WeekTopsAndBottoms,
    BestByPosition,
    DeterminedByDiscreteScoring,
    ChosenWrong,
    GooseEggs,
    UniquesStarted,
    BoomBust,
    json,
  };
  var hashKey = window.location.hash.substring(1);
  if (!toRender[hashKey]) {
    window.location.hash = "";
    hashKey = "";
  }
  const [toRenderKey, update] = useState(hashKey || Object.keys(toRender)[0]!);
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace" }}>
      <div
        style={{ display: "flex", backgroundColor: "grey", overflow: "scroll" }}
      >
        {Object.keys(toRender).map((key, i) => (
          <div
            key={i}
            style={bubbleStyle}
            onClick={() => {
              window.location.hash = key;
              update(key);
            }}
          >
            {key}
          </div>
        ))}
      </div>
      <div>
        <h1 style={bubbleStyle}>{toRenderKey}</h1>
        <div>{toRender[toRenderKey]!()}</div>
      </div>
    </div>
  );
}

enum Position {
  QB = 1,
  RB = 2,
  WR = 3,
  TE = 4,
  K = 5,
  DST = 16,
}

function count(arr: string[]): { [key: string]: number } {
  const c: { [key: string]: number } = {};
  arr.forEach((k) => {
    c[k] = (c[k] || 0) + 1;
  });
  return c;
}

const bubbleStyle = {
  backgroundColor: "white",
  display: "inline-block",
  borderRadius: "1em",
  border: "2px solid black",
  padding: "0.7em",
  margin: "0.5em",
};

//

function json() {
  return (
    <pre onClick={() => console.log(printF(FetchWrapped))}>
      {JSON.stringify(wrapped, null, 2)}
    </pre>
  );
}

function SqueezesAndStomps() {
  return <div></div>;
}

function WeekTopsAndBottoms() {
  return <div></div>;
}

function BestByPosition() {
  return <div></div>;
}

function DeterminedByDiscreteScoring() {
  return <div></div>;
}

function ChosenWrong() {
  return <div></div>;
}

function GooseEggs() {
  return <div></div>;
}

function UniquesStarted() {
  return (
    <div>
      {Object.values(Position)
        .filter((p) => Number.isInteger(p))
        .map((p) => p as Position)
        .map((p) => (
          <div key={p}>
            <div style={bubbleStyle}>
              {Position[p]}
              <div>
                {Object.values(wrapped.ffTeams)
                  .map((ffTeam) => ({
                    teamName: ffTeam.name,
                    started: Object.entries(
                      count(
                        Object.values(ffTeam.rosters).flatMap(
                          (roster) => roster.starting
                        )
                      )
                    )
                      .map(([playerId, c]) => ({
                        player: wrapped.nflPlayers[playerId],
                        c,
                      }))
                      .filter(({ player }) => player?.position === Position[p])
                      .map(({ player, c }) => `${player.name}: ${c}`),
                  }))
                  .sort((a, b) => a.started.length - b.started.length)
                  .map(({ teamName, started }, i) => (
                    <div key={i}>
                      <b>
                        {teamName}: ({started.length})
                      </b>{" "}
                      - {started.join(" , ")}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}

function BoomBust() {
  return <div></div>;
}
