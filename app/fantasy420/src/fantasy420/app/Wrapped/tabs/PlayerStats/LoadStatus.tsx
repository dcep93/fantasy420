import type { usePlayerStats } from "./usePlayerStats";

export default function LoadStatus(props: ReturnType<typeof usePlayerStats>) {
  return <>
    {props.loading && <p role="status">
      Loading player stats…
    </p>}
    {props.failedYears.length > 0 && <p role="alert">
      Could not load {props.failedYears.slice().sort((a, b) => a - b).join(", ")}. Career totals are incomplete.{" "}
      <button onClick={props.retry} disabled={props.loading}>Retry</button>
    </p>}
  </>;
}
