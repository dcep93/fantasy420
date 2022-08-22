import Catalog from "../../Catalog";
import draft from "./Draft";
import sos from "./Sos";

import { BrowserRouter } from "react-router-dom";

const pages = { sos, draft };

function index() {
  return (
    <BrowserRouter>
      <Catalog location={"ff"} pages={pages} />{" "}
    </BrowserRouter>
  );
}

export default index;
