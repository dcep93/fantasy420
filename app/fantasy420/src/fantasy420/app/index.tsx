import { BrowserRouter } from "react-router-dom";

import Catalog from "../Catalog";
import Accuracy from "./Accuracy";
import Defence from "./Defence";
import Draft from "./Draft";
import DraftValue from "./DraftValue";
import Peaked from "./Peaked";
import Wrapped from "./Wrapped";

const pages = {
  Accuracy,
  Wrapped,
  DraftValue,
  Peaked,
  Defence,
  Draft,
};
if (process.env.NODE_ENV === "development") {
}

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
