import { BrowserRouter } from "react-router-dom";

import Catalog from "./Catalog";
import Defense from "./Defense";
import Draft from "./Draft";
import PlayoffPredictability from "./PlayoffPredictability";
import Wrapped from "./Wrapped";

const pages = {
  Draft,
  Defense,
  PlayoffPredictability,
};

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} default={Wrapped} />
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
