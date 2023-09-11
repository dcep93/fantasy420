import { BrowserRouter } from "react-router-dom";

import Catalog from "../Catalog";
import Accuracy from "./Accuracy";
import Defence from "./Defence";
import Draft from "./Draft";
import DraftValue from "./Draft/Value";
import Peaked from "./Peaked";
import Schedule from "./Schedule";
import Wrapped from "./Wrapped";
import WrappedOld from "./WrappedOld";

const pages = {
  Schedule,
  WrappedOld,
  DraftValue,
  Peaked,
  Accuracy,
  Draft,
  Wrapped,
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
