import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const { chartUpdates } = vi.hoisted(() => ({ chartUpdates: vi.fn() }));

vi.mock("../..", () => ({ currentYear: "2026" }));
vi.mock("../../allWrapped", () => ({ default: {
  "2026": {
    nflPlayers: { warren: { id: "warren", name: "Tyler Warren", position: "TE", scores: { "1": 999 } } },
    ffTeams: {},
  },
} }));
vi.mock("./Chart", () => ({ default: ({ scores }: { scores: unknown }) => {
  chartUpdates(scores);
  return <div data-testid="scores">{JSON.stringify(scores)}</div>;
} }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test("shows fetched 2026 and historical scores, refreshed totals/ranks, and retries missing seasons", async () => {
  vi.resetModules();
  let fail2025 = true;
  const fetchMock = vi.fn(async (url: string) => {
    const year = Number(url.match(/(\d+)\.json$/)![1]);
    if (year === 2025 && fail2025) return new Response("Failed", { status: 503 });
    return new Response(JSON.stringify({ year, games: year >= 2025 ? [{ week: 1, teams: [{ boxScore: [{
      category: "receiving", labels: ["REC", "YDS", "TD"],
      players: [{ name: "Tyler Warren", stats: year === 2026 ? ["5", "53", "0"] : ["1", "10", "0"] }],
    }] }] }] : [] }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const PlayerStats = (await import("./index")).default;
  const { container } = render(<PlayerStats />);
  await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  expect(fetchMock.mock.calls[0][0]).toContain("2026.json");
  expect(screen.getByRole("alert")).toHaveTextContent("2025");
  expect(container.textContent).toContain('"year": 2026');
  expect(container.textContent).toContain('"position": "TE"');
  expect(container.textContent).toContain('"total": 10.3');
  expect(container.textContent).toContain('"totalRank": 1');
  expect(container.textContent).not.toContain("999");
  fail2025 = false;
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(container.textContent).toContain('"year": 2025');
  expect(container.textContent).toContain('"total": 12.3');
  expect(screen.getAllByTestId("scores")[0]).toHaveTextContent('"score":10.3');
});

test("renders cached data once, then all remote data, without requesting history again", async () => {
  vi.resetModules();
  const saved = new Map<string, unknown>(Array.from({ length: 21 }, (_, i) => {
    const year = 2005 + i;
    return [`https://dcep93.github.io/nflquery/data_v6/${year}.json`, {
      year, players: year === 2025 ? [{
        name: "Tyler Warren", position: "WR", total: 188.5,
        years: [{ year, total: 188.5, scores: [188.5] }],
      }] : [],
    }] as const;
  }));
  const match = vi.fn(async (url: string) => {
    const data = saved.get(url);
    return data ? new Response(JSON.stringify(data)) : undefined;
  });
  vi.stubGlobal("caches", { open: vi.fn(async () => ({ match })) });
  let finishCurrent!: (response: Response) => void;
  const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finishCurrent = resolve; }));
  vi.stubGlobal("fetch", fetchMock);

  for (let visit = 0; visit < 2; visit++) {
    vi.resetModules(); // Empty module memory; only persistent browser cache survives.
    chartUpdates.mockClear();
    const PlayerStats = (await import("./index")).default;
    const page = render(<PlayerStats />);
    await waitFor(() => expect(match).toHaveBeenCalledTimes(21 * (visit + 1)));
    await waitFor(() => expect(page.container.textContent).toContain('"total": 188.5'));
    expect(screen.getByRole("status")).toHaveTextContent("Loading player stats…");
    expect(screen.queryAllByTestId("scores")).toHaveLength(1);
    expect(chartUpdates).toHaveBeenCalledTimes(1); // One cached-data render.
    expect(page.container.textContent).not.toContain("/22");
    expect(fetchMock).toHaveBeenCalledTimes(visit + 1);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://dcep93.github.io/nflquery/data_v6/2026.json", { cache: "no-cache" }
    );
    finishCurrent(new Response(JSON.stringify({ year: 2026, games: [{ week: 1, teams: [{ boxScore: [{
      category: "receiving", labels: ["REC", "YDS", "TD"],
      players: [{ name: "Tyler Warren", stats: ["5", "53", "0"] }],
    }] }] }] })));
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
    expect(page.container.textContent).toContain('"total": 198.8');
    expect(screen.queryAllByTestId("scores")).toHaveLength(2);
    expect(chartUpdates).toHaveBeenCalledTimes(3); // One update of the two charts.
    // Simulate the parent's extension refresh: ownership changes, not scores.
    const allWrapped = (await import("../../allWrapped")).default;
    allWrapped["2026"] = {
      ...allWrapped["2026"],
      ffTeams: { owner: {
        id: "owner", name: "Updated owner", draft: [],
        rosters: { "0": { weekNum: "0", rostered: ["warren"], starting: [], projections: {} } },
      } },
    };
    page.rerender(<PlayerStats />);
    expect(page.container.textContent).toContain("Updated owner");
    expect(page.container.textContent).toContain('"total": 198.8');
    expect(fetchMock).toHaveBeenCalledTimes(visit + 1);
    expect(chartUpdates).toHaveBeenCalledTimes(5); // One owner update of the two charts.
    page.unmount();
  }
});
