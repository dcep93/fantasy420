import { printF } from "../Fetch";
import FetchWrapped, { WrappedType } from "./FetchWrapped";
import rawWrapped from "./wrapped.json";

const wrapped: WrappedType = rawWrapped;

export default function Wrapped() {
  return (
    <div>
      <div>
        <input readOnly value={printF(FetchWrapped)} />
      </div>
      <pre>{JSON.stringify(wrapped, null, 2)}</pre>
    </div>
  );
}
