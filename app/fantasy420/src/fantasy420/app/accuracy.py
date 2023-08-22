import json

with open("./accuracy_input.json") as fh:
    accuracy_input = json.load(fh)

espn = {}
for player in accuracy_input["lm"]["players"]:
    name = player["player"]["fullName"]
    stats = [
        stat for stat in player["player"]["stats"] if stat["id"] == "002022"
    ]
    stat = stats[0]
    nname = name.replace("'", "").replace('.', '').replace('-', '')
    if nname not in accuracy_input["players"]:
        print(name)
        continue
    espn[name] = {
        "position": accuracy_input["players"][nname]["position"],
        "adp": accuracy_input["adp"][name],
        "auction": -accuracy_input["avc"][name],
        "season_points": stat["appliedTotal"],
        "average_points": stat["appliedAverage"],
    }

# print(json.dumps({"espn": espn, "sources": a["extra"]}))