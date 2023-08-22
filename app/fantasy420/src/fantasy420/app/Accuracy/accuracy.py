import json
import sys

# curl -s 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/203836968?view=kona_player_info' \
#   -H 'x-fantasy-filter: {"players":{"filterSlotIds":{"value":[0,7,2,23,4,6]},"sortAppliedStatTotal":{"sortAsc":false,"sortPriority":2,"value":"002022"},"sortAppliedStatTotalForScoringPeriodId":null,"sortStatId":null,"sortStatIdForScoringPeriodId":null,"sortPercOwned":{"sortPriority":3,"sortAsc":false},"limit":500,"filterRanksForSlotIds":{"value":[0,2,4,6,17,16]},"filterStatsForTopScoringPeriodIds":{"value":2,"additionalValue":["002023","102023","002022","022023"]}}}' \
#   -H 'x-fantasy-source: kona' \
#   --compressed | python3 accuracy.py


def getPlayers():
    raw = sys.stdin.read()
    lm = json.loads(raw)
    return [(player["player"]["fullName"], [
        stat for stat in player["player"]["stats"] if stat["id"] == "002022"
    ][0]) for player in lm["players"]]


def main():
    with open("./accuracy_input.json") as fh:
        accuracy_input = json.load(fh)

    espn = {
        name: {
            "position": accuracy_input["players"][name]["position"],
            "adp": accuracy_input["adp"].get(name),
            "auction": accuracy_input["avc"].get(name),
            "season_points": stat["appliedTotal"],
            "average_points": stat["appliedAverage"],
        }
        for name, stat in getPlayers() if name in accuracy_input["players"]
    }

    print(
        json.dumps({
            "2022": {
                "espn": espn,
                "sources": accuracy_input["extra"]
            },
        }))


main()
