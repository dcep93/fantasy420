import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("../..", () => ({ currentYear: "2026" }));
vi.mock("../../allWrapped", () => ({ default: {
  "2026": {
    nflPlayers: { warren: { id: "warren", name: "Tyler Warren", position: "TE", scores: { "1": 999 } } },
    ffTeams: {},
  },
} }));
vi.mock("./Chart", () => ({ default: ({ scores }: { scores: unknown }) => <div data-testid="scores">{JSON.stringify(scores)}</div> }));

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
