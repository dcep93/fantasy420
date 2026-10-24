"""One-time ProbabilityMachine fit from committed, pre-week league snapshots.

Run from any directory: python app/fantasy420/scripts/calibrate_probability.py
No network or runtime fitting. Git rename history supplies contemporaneous player
values AND rosters; final archives supply only outcomes and the regular schedule.
"""
import datetime as dt
import functools
import json
import math
from pathlib import Path
import subprocess

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parents[1]
DATA = APP / "src/fantasy420/app/Wrapped/dataJson"
OUT = APP / "src/fantasy420/app/Wrapped/tabs/probabilityCalibration.json"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT).decode("utf-8")


def revisions(path):
    """Track the filename across renames, including the old wrapped.json."""
    lines = git("log", "--follow", "--name-status", "--format=@%H %ct", "--", path).splitlines()
    commit, stamp = None, None
    for line in lines:
        if line.startswith("@"):
            commit, stamp = line[1:].split()
        elif line and commit:
            fields = line.split("\t")
            if len(fields) >= 2 and fields[0] != "D":
                yield commit, int(stamp), fields[-1]


@functools.lru_cache(maxsize=None)
def snapshot(commit, path):
    return json.loads(git("show", f"{commit}:{path}"))


def strength(data, week):
    # Same feature as getWeeklyStrength: full roster, exclude bye players,
    # normalize to league mean 100, and use JS-style rounding.
    totals = {}
    for team in data["ffTeams"].values():
        roster = team["rosters"].get(str(week), team["rosters"].get("0", {}))
        total, known = 0, False
        for pid in roster.get("rostered", []):
            pid = str(pid)
            value = data.get("fantasyCalc", {}).get("players", {}).get(pid)
            if not isinstance(value, (float, int)) or not math.isfinite(value) or value < 0:
                continue
            known = True
            player = data["nflPlayers"].get(pid, {})
            bye = data["nflTeams"].get(str(player.get("nflTeamId")), {}).get("byeWeek")
            total += 0 if bye == week else value
        if known:
            totals[str(team["id"])] = total
    average = sum(totals.values()) / len(totals) if totals else 0
    return {tid: math.floor(100 * value / average + 0.5) for tid, value in totals.items()} if average else {}


def cutoff(year, week):
    # Thursday 00:00 UTC, conservatively before the opening game of each week.
    # Regular seasons here are 2021–2026 (first Thursday after Labor Day).
    september = dt.datetime(year, 9, 1, tzinfo=dt.timezone.utc)
    labor_day = september + dt.timedelta(days=(-september.weekday()) % 7)
    return (labor_day + dt.timedelta(days=3 + 7 * (week - 1))).timestamp()


def score(data, tid, week):
    roster = data["ffTeams"][tid]["rosters"].get(str(week))
    if roster is None:
        return None
    return sum(data["nflPlayers"].get(str(pid), {}).get("scores", {}).get(str(week), 0)
               for pid in roster["starting"])


def probability(gap, slope):
    return 1 / (1 + math.exp(max(-700, min(700, -gap * slope))))


def fit(rows):
    # Symmetric logistic model: equal strengths => 50%, swapping sides => 1-p.
    # Nonnegative one-parameter MLE; no arbitrary intercept/home-field effect.
    def gradient(slope):
        return sum(r["gap"] * (r["result"] - probability(r["gap"], slope)) for r in rows)
    if gradient(0) <= 0:
        return 0.0
    lo, hi = 0.0, 1.0
    while gradient(hi) > 0 and hi < 64:
        hi *= 2
    for _ in range(80):
        middle = (lo + hi) / 2
        if gradient(middle) > 0:
            lo = middle
        else:
            hi = middle
    return (lo + hi) / 2


def metrics(rows, slope):
    ps = [probability(r["gap"], slope) for r in rows]
    return {
        "games": len(rows),
        "brier": sum((p - r["result"]) ** 2 for p, r in zip(ps, rows)) / len(rows),
        "logLoss": -sum(r["result"] * math.log(max(p, 1e-15)) +
                        (1 - r["result"]) * math.log(max(1 - p, 1e-15))
                        for p, r in zip(ps, rows)) / len(rows),
    }


def main():
    rows, sources, skipped = [], [], []
    for file in sorted(DATA.glob("*.json")):
        year = int(file.stem)
        final = json.loads(file.read_text(encoding="utf-8"))
        history = sorted(revisions(file.relative_to(ROOT).as_posix()), key=lambda r: r[1], reverse=True)
        completed = final.get("latestScoringPeriod", max(map(int, final["ffMatchups"])))
        for week_str, games in final["ffMatchups"].items():
            week = int(week_str)
            if week > completed:
                continue
            before = cutoff(year, week)
            selected = None
            for commit, committed, path in history:
                if committed >= before:
                    continue
                if before - committed > 21 * 86400:
                    break
                data = snapshot(commit, path)
                calc_time = data.get("fantasyCalc", {}).get("timestamp", 0) / 1000
                # Early snapshots omit year; rename lineage and timestamp bound
                # identify their season without substituting later archive data.
                if str(data.get("year", year)) != str(year) or not before - 21 * 86400 <= calc_time < before:
                    continue
                strengths = strength(data, week)
                if len(strengths) != 10:
                    continue
                selected = (commit, path, calc_time, strengths)
                break
            if selected is None:
                skipped.append(f"{year}:{week}")
                continue
            commit, path, calc_time, strengths = selected
            sources.append({"year": year, "week": week, "commit": commit, "path": path,
                            "cutoffUtc": dt.datetime.fromtimestamp(before, dt.timezone.utc).isoformat(),
                            "fantasyCalcTimestamp": int(calc_time * 1000)})
            for a, b in games:
                sa, sb = score(final, a, week), score(final, b, week)
                if sa is None or sb is None or a not in strengths or b not in strengths:
                    continue
                rows.append({"year": year, "week": week, "a": a, "b": b,
                             "gap": strengths[a] - strengths[b],
                             "result": 1 if sa > sb else 0 if sa < sb else 0.5})
    if len(rows) < 30:
        raise RuntimeError(f"Insufficient contemporaneous data: {len(rows)} matchups")
    slope = fit(rows)
    years = sorted({r["year"] for r in rows})
    validation = []
    for year in years[1:]:
        train = [r for r in rows if r["year"] < year]
        test = [r for r in rows if r["year"] == year]
        validation.append({"year": year, "trainingGames": len(train), "slope": fit(train),
                           **metrics(test, fit(train)), "baseline": metrics(test, 0)})
    output = {
        "model": "symmetric-logistic-strength-gap",
        "slope": slope,
        "sourceHead": git("rev-parse", "HEAD").strip(),
        "years": years,
        "games": len(rows),
        "maxSnapshotAgeDays": 21,
        "training": metrics(rows, slope),
        "forwardValidation": validation,
        "assumptions": ["Independent remaining matchup winners; future ties have probability zero.",
                        "Pre-week committed player values, rosters and byes; never final-season values for training features.",
                        "Weeks without a complete pre-week snapshot no more than 21 days old are excluded.",
                        "Historical tied games count as half a win when fitting."],
        "skippedWeeks": skipped,
        "sources": sources,
        "samples": rows,
    }
    OUT.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in output.items() if k not in ("sources", "samples", "skippedWeeks")}, indent=2))


if __name__ == "__main__":
    main()
