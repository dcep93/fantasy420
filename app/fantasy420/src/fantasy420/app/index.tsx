import { BrowserRouter } from "react-router-dom";

import Catalog from "../Catalog";
import Accuracy from "./Accuracy";
import Defense from "./Defense";
import Draft from "./Draft";
import DraftValue from "./Draft/Value";
import Schedule from "./Schedule";
import Wrapped from "./Wrapped";

const pages = {
  Wrapped,
  Schedule,
  DraftValue,
  Draft,
};
if (process.env.NODE_ENV === "development") {
  Object.assign(pages, {
    Defense,
  });
}

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} default={Accuracy} />
    </BrowserRouter>
  );
}

export default index;
