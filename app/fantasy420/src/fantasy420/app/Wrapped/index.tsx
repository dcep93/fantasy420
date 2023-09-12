import { printF } from "../Fetch";
import FetchWrapped, { WrappedType } from "./FetchWrapped";
import rawWrapped from "./wrapped.json";

export const wrapped: WrappedType = rawWrapped;

export default function Wrapped() {
  console.log(printF(FetchWrapped));
  return (
    <div>
      <pre onClick={() => FetchWrapped()}>
        {JSON.stringify(wrapped, null, 2)}
      </pre>
    </div>
  );
}
