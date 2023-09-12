import { ReactNode, useState } from "react";
import { printF } from "../Fetch";
import FetchWrapped, { WrappedType } from "./FetchWrapped";
import rawWrapped from "./wrapped.json";

export const wrapped: WrappedType = rawWrapped;

export default function Wrapped() {
  document.title = "Fantasy Wrapped";
  const toRender: { [key: string]: () => ReactNode } = {
    json,
  };
  const [toRenderKey, update] = useState(
    window.location.hash.substring(1) || Object.keys(toRender)[0]!
  );
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace" }}>
      <div
        style={{ display: "flex", backgroundColor: "grey", overflow: "scroll" }}
      >
        {Object.keys(toRender).map((key, i) => (
          <div
            key={i}
            style={{
              backgroundColor: "white",
              display: "inline-block",
              borderRadius: "1em",
              border: "2px solid black",
              padding: "0.7em",
              margin: "0.5em",
            }}
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
        <h1
          style={{
            backgroundColor: "white",
            display: "inline-block",
            borderRadius: "1em",
            border: "2px solid black",
            padding: "0.7em",
            margin: "0.5em",
          }}
        >
          {toRenderKey}
        </h1>
        <div>{toRender[toRenderKey]!()}</div>
      </div>
    </div>
  );
}

function json() {
  return (
    <pre onClick={() => console.log(printF(FetchWrapped))}>
      {JSON.stringify(wrapped, null, 2)}
    </pre>
  );
}

// WeekTopsAndBottoms: WeekWinnersAndLosers(data),
// SqueezesAndStomps: SqueezesAndStomps(data),
// BestByPosition: BestByStreamingPosition(data),
// DeterminedByDiscreteScoring: GamesDeterminedByDiscreteScoring(data),
// ChosenWrong: TimesChosenWrong(data),
// GooseEggs: GooseEggs(data),
// StudsStarted: StudsStarted(data),
// BoomBust: BoomBust(data),
