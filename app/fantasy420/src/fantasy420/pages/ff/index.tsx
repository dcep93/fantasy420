import Catalog from "../../Catalog";
import wrapped from "../wrapped";
import draft from "./Draft";
import Horoscope from "./Horoscope";
import sos from "./Sos";
import Value from "./Value";

import { BrowserRouter } from "react-router-dom";

const pages = { sos, draft, wrapped, Horoscope, Value };

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
