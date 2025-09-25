#!/usr/bin/env python3
"""Utility to spot-check fantasyCalc.history accuracy.

The script selects a random git commit whose author date matches one of the
stored fantasyCalc history snapshots for 2021-2023. It then prints the stored
entry alongside an independently recomputed version based on that commit's
roster data so the two can be compared for correctness.
"""

from __future__ import annotations

import json
import random
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

REPO_ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(
    "app/fantasy420/src/fantasy420/app/Wrapped/dataJson"
)
YEARS = ("2021", "2022", "2023")
REL_PATH_TEMPLATE = (
    "app/fantasy420/src/fantasy420/app/Wrapped/dataJson/{year}.json"
)


@dataclass(frozen=True)
class HistoryEntry:
    year: str
    entry: Dict


def load_current_history() -> Dict[Tuple[str, int], HistoryEntry]:
    """Load history entries from the working tree grouped by (year, date)."""
    grouped: Dict[Tuple[str, int], HistoryEntry] = {}
    for year in YEARS:
        json_path = REPO_ROOT / DATA_DIR / f"{year}.json"
        with json_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        for hist_entry in data.get("fantasyCalc", {}).get("history", []):
            grouped[(year, hist_entry["date"])] = HistoryEntry(
                year=year, entry=hist_entry
            )
    return grouped


def git_log_for_year(year: str) -> Iterable[Tuple[str, int]]:
    """Yield (commit hash, timestamp ms) for changes to the year's data file."""
    rel_path = REL_PATH_TEMPLATE.format(year=year)
    result = subprocess.run(
        ["git", "log", "--pretty=format:%H\t%ct", "--", rel_path],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    for line in result.stdout.strip().splitlines():
        if not line:
            continue
        commit_hash, _, ts_str = line.partition("\t")
        if not commit_hash or not ts_str:
            continue
        try:
            ts_ms = int(ts_str) * 1000
        except ValueError:
            continue
        yield commit_hash, ts_ms


def load_json_at_commit(commit: str, year: str) -> Dict:
    """Load a year's JSON file from a specific commit."""
    rel_path = REL_PATH_TEMPLATE.format(year=year)
    target = f"{commit}:{rel_path}"
    result = subprocess.run(
        ["git", "show", target],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def compute_expected_values(year_data: Dict) -> Dict[str, float]:
    """Recompute the fantasyCalc snapshot for the provided commit data."""
    players = year_data.get("fantasyCalc", {}).get("players", {})
    teams = year_data.get("ffTeams", {})
    expected: Dict[str, float] = {}
    for team_id, team in teams.items():
        roster = team.get("rosters", {}).get("0", {}).get("rostered", [])
        total = Decimal("0")
        for raw_player_id in roster:
            player_id = str(raw_player_id)
            value = players.get(player_id)
            if value is None:
                # Some historical rosters may be stored as ints; try fallback.
                value = players.get(raw_player_id)
            if value is None:
                continue
            total += Decimal(str(value))
        quantized = total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        expected[team_id] = float(quantized)
    return dict(sorted(expected.items(), key=lambda item: int(item[0])))


def pick_random_matching_commit(
    grouped_history: Dict[Tuple[str, int], HistoryEntry],
) -> Tuple[str, int, HistoryEntry]:
    """Select a random commit whose timestamp matches a stored history entry."""
    matches: List[Tuple[str, int, HistoryEntry]] = []
    for year in YEARS:
        for commit_hash, ts_ms in git_log_for_year(year):
            entry = grouped_history.get((year, ts_ms))
            if entry is None:
                continue
            matches.append((commit_hash, ts_ms, entry))
    if not matches:
        raise RuntimeError(
            "No commits found whose commit timestamps align with stored "
            "fantasyCalc history dates."
        )
    rng = random.SystemRandom()
    return rng.choice(matches)


def main() -> None:
    grouped_history = load_current_history()
    try:
        commit_hash, ts_ms, history_entry = pick_random_matching_commit(
            grouped_history
        )
    except RuntimeError as err:
        print(f"Unable to select commit for verification: {err}")
        return
    dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
    print(
        f"Selected commit: {commit_hash} (UTC {dt.isoformat()}) for year {history_entry.year}"
    )

    recorded = history_entry.entry
    print("\nRecorded entry from dataset:")
    print(json.dumps(recorded, indent=2, sort_keys=True))

    commit_data = load_json_at_commit(commit_hash, history_entry.year)
    expected_values = compute_expected_values(commit_data)
    expected_entry = {
        "values": expected_values,
        "date": history_entry.entry["date"],
    }
    print("\nRecomputed entry from commit data:")
    print(json.dumps(expected_entry, indent=2, sort_keys=True))

    all_teams = set(expected_values) | set(recorded["values"])
    diffs = {
        team: expected_values.get(team, 0) - recorded["values"].get(team, 0)
        for team in all_teams
    }
    if any(abs(delta) > 1e-6 for delta in diffs.values()):
        print("\nDifferences (expected - recorded):")
        for team, delta in sorted(diffs.items(), key=lambda item: int(item[0])):
            if abs(delta) > 1e-6:
                print(f"  Team {team}: {delta:+.2f}")
    else:
        print("\nAll values match exactly.")


if __name__ == "__main__":
    main()
