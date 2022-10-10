import { BrowserRouter } from "react-router-dom";

import Catalog from "../Catalog";
import Draft from "./Draft";
import Horoscope from "./Horoscope";
import Peaked from "./Peaked";
import Sos from "./Sos";
import Value from "./Value";
import Wrapped from "./Wrapped";

const pages = { Sos, Wrapped, Horoscope, Value, Peaked };
if (process.env.NODE_ENV === "development") {
  Object.assign(pages, { Draft });
}

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
