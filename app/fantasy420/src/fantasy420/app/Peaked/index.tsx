import React from "react";

const url =
  "https://pbs.twimg.com/media/FcnWjXvWYAAiUTm?format=jpg&name=4096x4096";

type ValuesType = { [playerName: string]: number };

export default function Peaked() {
  return <SubPeaked />;
}

function parse(data: string): ValuesType {
  return { sup: 123, dude: 456 };
}

class SubPeaked extends React.Component<{}, { values: ValuesType }> {
  componentDidMount(): void {
    (window.location.href.startsWith("http://localhost:")
      ? fetch(url)
      : fetch("https://proxy420.appspot.com/", {
          method: "POST",
          body: JSON.stringify({ url, maxAgeMs: 10 * 60 * 1000 }),
          headers: {
            "Content-Type": "application/json",
          },
        })
    )
      .then((resp) => resp.text())
      .then(parse)
      .then((values) => this.setState({ values }));
  }

  render() {
    return (
      <div>
        {Object.entries(this.state?.values || {}).map(([playerName, value]) => (
          <div key={playerName}>
            <span>{playerName}</span>
            <span> </span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    );
  }
}
