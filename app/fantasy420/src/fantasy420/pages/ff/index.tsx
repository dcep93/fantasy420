import Catalog from "../../Catalog";
import wrapped from "../wrapped";
import draft from "./Draft";
import Horoscope from "./Horoscope";
import sos from "./Sos";

import { BrowserRouter } from "react-router-dom";

const pages =
  !process.env.NODE_ENV || process.env.NODE_ENV === "development"
    ? { sos, draft, wrapped, Horoscope }
    : ({ Horoscope, wrapped } as { [k: string]: () => JSX.Element });

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} />
    </BrowserRouter>
  );
}

export default index;
