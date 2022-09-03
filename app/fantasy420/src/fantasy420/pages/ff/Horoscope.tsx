import FlexColumns from "../../FlexColumns";

import horoscope from "./horoscope.json";

function Horoscope() {
  const results = get_results(horoscope);
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <FlexColumns
        columns={Object.entries(results).map(([key, arr]) => (
          <pre key={key}>
            {key}
            <br />
            {JSON.stringify(
              arr.map(
                (o) =>
                  `${o.name} (${o.sign}) + ${o.qbname} (${o.qbsign}) = ${o.direct_compatibility}`
              ),
              null,
              2
            )}
          </pre>
        ))}
      />
    </div>
  );
}

function get_results(horoscope: any[][]) {
  const h = horoscope
    .map(([name, sign, qbname, qbsign, direct_compatibility, adp]) => ({
      name,
      sign,
      qbname,
      qbsign,
      direct_compatibility,
      adp,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    good: h.filter((o) => o.direct_compatibility > 0),
    bad: h.filter((o) => o.direct_compatibility < 0),
  };
}

export default Horoscope;
