import { printF } from "../Fetch";
import FetchWrapped, { WrappedType } from "./FetchWrapped";
import rawWrapped from "./wrapped.json";

const wrapped: WrappedType = rawWrapped;

var initialized = false;

export default function Wrapped() {
  if (!initialized) {
    initialized = true;
    console.log(printF(FetchWrapped));
    FetchWrapped();
  }
  return (
    <div>
      <pre>{JSON.stringify(wrapped, null, 2)}</pre>
    </div>
  );
}
