import { BrowserRouter } from "react-router-dom";

import Catalog from "../Catalog";
import Defence from "./Defence";
import Draft from "./Draft";
import DraftValue from "./Draft/Value";
import Peaked from "./Peaked";
import Schedule from "./Schedule";
import Wrapped from "./Wrapped";

const pages = {
  Wrapped,
  Peaked,
  Schedule,
  DraftValue,
  Draft,
};
if (process.env.NODE_ENV === "development") {
  Object.assign(pages, {
    Defence,
  });
}

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
