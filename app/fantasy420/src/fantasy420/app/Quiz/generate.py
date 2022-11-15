import json

import requests

year = 2022
league_id = 203836968
url = f'https://fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}?view=kona_player_info'
headers = {
    'x-fantasy-filter':
    json.dumps({
        "players": {
            "filterSlotIds": {
                "value": [0, 2, 23, 4, 6]
            },
            "filterStatsForTopScoringPeriodIds": {
                "value": 2,
                "additionalValue": ["002022"]
            }
        }
    })
}


def main():
    resp = requests.get(url, headers=headers)
    data = resp.json()

    output = [
        k for k in [{
            i: j
            for i, j in {
                "full_name":
                p["player"]["fullName"],
                "fantasy_points":
                p["ratings"]["0"]["totalRating"],
                "position": [None, "QB", "RB", "WR", "TE"][
                    p["player"]["defaultPositionId"]],
                "throws":
                p["player"]["stats"][-1]["stats"].get("0", 0),
                "completions":
                p["player"]["stats"][-1]["stats"].get("1", 0),
                "passing_yards":
                p["player"]["stats"][-1]["stats"].get("3", 0),
                "passing_touchdowns":
                p["player"]["stats"][-1]["stats"].get("4", 0),
                "interceptions":
                p["player"]["stats"][-1]["stats"].get("20", 0),
                "rushes":
                p["player"]["stats"][-1]["stats"].get("23", 0),
                "rushing_yards":
                p["player"]["stats"][-1]["stats"].get("24", 0),
                "rushing_touchdowns":
                p["player"]["stats"][-1]["stats"].get("25", 0),
                "receptions":
                p["player"]["stats"][-1]["stats"].get("41", 0),
                "targets":
                p["player"]["stats"][-1]["stats"].get("58", 0),
                "receiving_touchdowns":
                p["player"]["stats"][-1]["stats"].get("43", 0),
            }.items() if type(j) is str or j != 0
        } for p in data["players"]] if k.get("fantasy_points", 0) > 0
    ]

    print(json.dumps(output))


if __name__ == "__main__":
    main()
