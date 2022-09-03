import FlexColumns from "../../FlexColumns";

import horoscope from "./horoscope.json";

function Horoscope() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <FlexColumns
        columns={Object.entries(horoscope).map(([key, arr]) => (
          <pre key={key}>
            {key}
            <br />
            {JSON.stringify(arr, null, 2)}
          </pre>
        ))}
      />
    </div>
  );
}

export default Horoscope;
