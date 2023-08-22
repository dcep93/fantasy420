import { BrowserRouter } from "react-router-dom";

import Catalog from "../Catalog";
import Accuracy from "./Accuracy";
import Draft from "./Draft";
import DraftValue from "./DraftValue";
import Peaked from "./Peaked";
import Wrapped from "./Wrapped";

const pages = {
  Wrapped,
  DraftValue,
  Peaked,
};
if (process.env.NODE_ENV === "development") {
  Object.assign(pages, { Accuracy, Draft });
}

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
