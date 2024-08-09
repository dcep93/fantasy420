import { BrowserRouter } from "react-router-dom";

import Catalog from "./Catalog";
import Defense from "./Defense";
import Draft from "./Draft";
import Fetch from "./Fetch";
import PlayoffPredictability from "./PlayoffPredictability";
import Wrapped from "./Wrapped";

const pages = {
  Fetch,
  Defense,
  Draft,
  PlayoffPredictability,
};

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} default={Wrapped} />
    </BrowserRouter>
  );
}

export default index;
