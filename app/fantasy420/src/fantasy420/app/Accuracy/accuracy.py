import json


def getPlayers():
    # name = player["player"]["fullName"]
    # stat = [
    #     stat for stat in player["player"]["stats"]
    #     if stat["id"] == "002022"
    # ][0]
    return []


def main():
    with open("./accuracy_input.json") as fh:
        accuracy_input = json.load(fh)

    espn = {
        name: {
            "position": accuracy_input["players"][name]["position"],
            "adp": accuracy_input["adp"][name],
            "auction": -accuracy_input["avc"][name],
            "season_points": stat["appliedTotal"],
            "average_points": stat["appliedAverage"],
        }
        for name, stat in getPlayers()
    }

    print(json.dumps({"espn": espn, "sources": accuracy_input["extra"]}))


main()
