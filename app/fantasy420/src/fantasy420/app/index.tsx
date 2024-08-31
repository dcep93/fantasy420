import { BrowserRouter, Route, Routes } from "react-router-dom";

import Defense from "./Defense";
import Draft from "./Draft";
import FetchWrapped from "./FetchWrapped";
import HistoryGraph from "./HistoryGraph";
import PlayoffPredictability from "./PlayoffPredictability";
import Wrapped from "./Wrapped";

const pages = {
  FetchWrapped,
  Draft,
  HistoryGraph,
  Defense,
  PlayoffPredictability,
};

export default function index() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Wrapped />} />
        {Object.entries(pages).map(([k, V]) => (
          <Route key={k} path={`/${k}/*`} element={<V />} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export function printF(
  f: (...args: any[]) => any,
  argsStr: string = ""
): string {
  return `${f
    .toString()
    .split("\n")
    .map((i) => i.replace(/\/\/$/, "").split("// ")[0].trim())
    .join(" ")}; ${f.name}(${argsStr})`;
}
