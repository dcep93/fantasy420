#!/usr/bin/env python3
"""Generate historical wrapped.json metrics across commits.

This script scans every commit in the repository since a specified base
SHA, identifies the wrapped JSON payload for that commit, and produces
summary artifacts used for further analysis.

Outputs:
- sha_to_path: JSON mapping commit SHA -> path of wrapped JSON file.
- timestamp_to_data.json: mapping timestamp string -> data summary.
- filtered_data.json: filtered version removing entries with <1%% change.
"""
from __future__ import annotations

import json
import re
import subprocess
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

BASE_SHA = "34b793f52e40d74e215a9b93a9460f632ae349c2"


def run_git(args: Iterable[str]) -> bytes:
    return subprocess.check_output(["git", *args])


@dataclass
class WrappedData:
    commit: str
    path: str
    data: Dict
    timestamp_ms: int
    season: int
    team_totals: Dict[str, float]


def human_string(timestamp_ms: int) -> str:
    dt = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
    return dt.isoformat()


def parse_season(data: Dict, path: str, commit: str) -> int:
    year = data.get("year")
    if isinstance(year, str) and year.isdigit():
        return int(year)
    if isinstance(year, int):
        return year
    matches = re.findall(r"(20\d{2})", path)
    if matches:
        try:
            return int(matches[-1])
        except ValueError:
            pass
    commit_time = int(run_git(["show", "-s", "--format=%ct", commit]).decode().strip())
    return datetime.fromtimestamp(commit_time, tz=timezone.utc).year


def extract_fantasy_calc(fc: Dict) -> Tuple[Dict[str, float], Optional[int]]:
    timestamp = None
    candidates: Dict[str, float] = {}
    if isinstance(fc, dict) and "players" in fc and isinstance(fc["players"], dict):
        timestamp = fc.get("timestamp")
        source = fc["players"]
    else:
        timestamp = fc.get("timestamp") if isinstance(fc, dict) else None
        source = fc if isinstance(fc, dict) else {}
    for key, value in source.items():
        key_str = str(key)
        if not re.fullmatch(r"-?\d+", key_str):
            continue
        if isinstance(value, (int, float)):
            candidates[key_str] = float(value)
    return candidates, timestamp


def pick_rostered_ids(team: Dict) -> List[str]:
    rosters = team.get("rosters")
    if not isinstance(rosters, dict):
        return []
    if "0" in rosters and isinstance(rosters["0"], dict):
        roster = rosters["0"].get("rostered")
        if isinstance(roster, list):
            return [str(pid) for pid in roster]
    # fall back to earliest roster key
    try:
        sorted_keys = sorted(rosters.keys(), key=lambda x: int(x) if str(x).isdigit() else str(x))
    except Exception:
        sorted_keys = list(rosters.keys())
    for key in sorted_keys:
        entry = rosters.get(key)
        if isinstance(entry, dict):
            roster = entry.get("rostered")
            if isinstance(roster, list):
                return [str(pid) for pid in roster]
    return []


def compute_team_totals(ff_teams: Dict, player_values: Dict[str, float]) -> Dict[str, float]:
    totals: Dict[str, float] = {}
    for team_id, team in ff_teams.items():
        roster_ids = pick_rostered_ids(team if isinstance(team, dict) else {})
        total = 0.0
        for pid in roster_ids:
            total += float(player_values.get(pid, 0.0))
        totals[str(team_id)] = total
    return totals


def parse_commit_timestamp(commit: str) -> int:
    commit_seconds = int(run_git(["show", "-s", "--format=%ct", commit]).decode().strip())
    return commit_seconds * 1000


def parse_wrapped_path(commit: str, previous_path: Optional[str]) -> Tuple[str, Dict]:
    candidates: List[Tuple[str, Dict]] = []
    search_paths: List[str] = []

    if previous_path:
        search_paths.append(previous_path)
    # Prioritise the previous path before scanning
    for path in list(search_paths):
        try:
            content = run_git(["show", f"{commit}:{path}"])
            data = json.loads(content)
            if isinstance(data, dict) and "fantasyCalc" in data:
                return path, data
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            continue

    tree = run_git(["ls-tree", "-r", commit, "--name-only"]).decode().splitlines()
    for path in tree:
        if not path.endswith(".json"):
            continue
        if "Wrapped" not in path and "wrapped" not in path:
            continue
        try:
            content = run_git(["show", f"{commit}:{path}"])
            data = json.loads(content)
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and "fantasyCalc" in data:
            candidates.append((path, data))

    if not candidates:
        raise RuntimeError(f"Unable to locate wrapped.json for commit {commit}")

    def candidate_key(item: Tuple[str, Dict]) -> Tuple[int, int, int, str]:
        path, data = item
        season = None
        year_value = data.get("year")
        if isinstance(year_value, str) and year_value.isdigit():
            season = int(year_value)
        elif isinstance(year_value, int):
            season = year_value
        else:
            matches = re.findall(r"(20\d{2})", path)
            if matches:
                try:
                    season = int(matches[-1])
                except ValueError:
                    season = None
        if season is None:
            season_score = -10**9
        else:
            season_score = season
        wrapped_name = 1 if path.endswith("wrapped.json") else 0
        depth_score = -path.count("/")
        return (season_score, wrapped_name, depth_score, path)

    best_path, best_data = max(candidates, key=candidate_key)
    return best_path, best_data


def gather_wrapped_data() -> List[WrappedData]:
    commits = run_git(["rev-list", "--reverse", f"{BASE_SHA}..HEAD"]).decode().strip().splitlines()
    results: List[WrappedData] = []
    current_path: Optional[str] = None
    for commit in commits:
        path, data = parse_wrapped_path(commit, current_path)
        current_path = path
        player_values, timestamp_ms = extract_fantasy_calc(data.get("fantasyCalc", {}))
        if timestamp_ms is None:
            timestamp_ms = parse_commit_timestamp(commit)
        season = parse_season(data, path, commit)
        team_totals = compute_team_totals(data.get("ffTeams", {}), player_values)
        results.append(WrappedData(
            commit=commit,
            path=path,
            data=data,
            timestamp_ms=int(timestamp_ms),
            season=season,
            team_totals=team_totals,
        ))
    return results


def build_timestamp_mapping(entries: List[WrappedData]) -> "OrderedDict[str, Dict]":
    ordered = OrderedDict()
    for entry in sorted(entries, key=lambda e: e.timestamp_ms):
        ordered[human_string(entry.timestamp_ms)] = {
            "sha": entry.commit,
            "nflSeason": entry.season,
            "values": entry.team_totals,
        }
    return ordered


def filter_entries(entries: List[WrappedData]) -> List[WrappedData]:
    filtered: List[WrappedData] = []
    last_totals: Optional[Dict[str, float]] = None
    for entry in sorted(entries, key=lambda e: e.timestamp_ms):
        if last_totals is None:
            filtered.append(entry)
            last_totals = entry.team_totals
            continue
        all_keys = set(last_totals) | set(entry.team_totals)
        changed = False
        for key in all_keys:
            prev = float(last_totals.get(key, 0.0))
            curr = float(entry.team_totals.get(key, 0.0))
            if abs(prev) < 1e-6:
                if abs(curr) > 1e-6:
                    changed = True
                    break
                else:
                    continue
            if abs(curr - prev) / abs(prev) > 0.01:
                changed = True
                break
        if changed:
            filtered.append(entry)
            last_totals = entry.team_totals
    return filtered


def main() -> None:
    entries = gather_wrapped_data()

    sha_to_path = OrderedDict((entry.commit, entry.path) for entry in entries)
    timestamp_map = build_timestamp_mapping(entries)
    filtered_entries = filter_entries(entries)
    filtered_map = build_timestamp_mapping(filtered_entries)

    Path("sha_to_path").write_text(json.dumps(sha_to_path, indent=2) + "\n")
    Path("timestamp_to_data.json").write_text(json.dumps(timestamp_map, indent=2) + "\n")
    Path("filtered_data.json").write_text(json.dumps(filtered_map, indent=2) + "\n")


if __name__ == "__main__":
    main()
