import { BrowserRouter, Route, Routes } from "react-router-dom";

import Defense from "./Defense";
import Draft from "./Draft";
import FetchWrapped from "./FetchWrapped";
import PlayoffPredictability from "./PlayoffPredictability";
import Wrapped from "./Wrapped";

const pages = {
  FetchWrapped,
  Draft,
  Defense,
  PlayoffPredictability,
};

function index() {
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

export function printF(f: (...args: any[]) => any): string {
  return `${f
    .toString()
    .split("\n")
    .map((i) => i.split("// ")[0].trim())
    .join(" ")}; ${f.name}()`;
}

export default index;
