import { BrowserRouter } from "react-router-dom";

import Catalog from "../Catalog";
import Draft from "./Draft";
import Horoscope from "./Horoscope";
import Peaked from "./Peaked";
import Quiz from "./Quiz";
import Sos from "./Sos";
import Standings from "./Standings";
import Value from "./Value";
import Wrapped from "./Wrapped";

const pages = {
  Sos,
  Wrapped,
  Horoscope,
  Value,
  Peaked,
  Quiz,
  Draft,
  Standings,
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
