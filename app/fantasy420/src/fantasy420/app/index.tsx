import { BrowserRouter, Route, Routes } from "react-router-dom";

import Draft from "./Draft";
import FetchWrapped from "./FetchWrapped";
import IdealDraft from "./IdealDraft";
import Wrapped from "./Wrapped";

const pages = {
  FetchWrapped,
  Draft,
  IdealDraft,
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
