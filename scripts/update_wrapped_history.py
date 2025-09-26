import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
filtered_path = ROOT / "filtered_data.json"
data_dir = ROOT / "app" / "fantasy420" / "src" / "fantasy420" / "app" / "Wrapped" / "dataJson"

with filtered_path.open() as f:
    filtered_data = json.load(f)

history_by_season: dict[str, list[dict]] = {}
for iso_ts, payload in filtered_data.items():
    season = str(payload["nflSeason"])
    dt = datetime.fromisoformat(iso_ts)
    epoch_ms = int(dt.timestamp() * 1000)
    values = payload["values"]
    history_by_season.setdefault(season, []).append({
        "values": values,
        "date": epoch_ms,
    })

for season_entries in history_by_season.values():
    season_entries.sort(key=lambda entry: entry["date"])

pattern = re.compile(r'    "history": \[(?:.|\n)*?    ]')

for json_path in sorted(data_dir.glob("*.json")):
    season = json_path.stem
    if season not in history_by_season:
        continue
    entries = history_by_season[season]
    history_json = json.dumps(entries, indent=2)
    history_lines = history_json.splitlines()
    history_block = '    "history": ' + history_lines[0]
    if len(history_lines) > 1:
        history_block += "\n" + "\n".join("    " + line for line in history_lines[1:])

    original_text = json_path.read_text()
    updated_text, count = pattern.subn(history_block, original_text, count=1)
    if count == 0:
        raise ValueError(f"No history block found in {json_path}")
    json_path.write_text(updated_text)
