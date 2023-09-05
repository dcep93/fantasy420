import json
import requests
import typing

NUM_EXECUTORS = 8

YEAR = 2023


def main():
    schedule = get_schedule()
    vegas = get_vegas(schedule)
    results = get_results(vegas)
    print(json.dumps(results))
    print(json.dumps(vegas))


def get_schedule() -> typing.Dict[str, typing.List[str]]:
    resp = json.loads(
        requests.get(
            f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{YEAR}?view=proTeamSchedules_wl"
        ).text)
    proTeams = resp["settings"]["proTeams"]
    idToTeam = {team["id"]: team["name"] for team in proTeams}
    return {
        team["name"]: [
            idToTeam[opp] for opp in [[
                c
                for c in [game[0]["awayProTeamId"], game[0]["homeProTeamId"]]
                if c != team["id"]
            ][0] for game in team["proGamesByScoringPeriod"].values()]
        ]
        for team in proTeams
    }


def get_vegas(
    schedule: typing.Dict[str, typing.List[str]]
) -> typing.Dict[str, typing.List[float]]:
    lines = json.loads(
        requests.get(
            "https://sportsbook-us-ny.draftkings.com/sites/US-NY-SB/api/v5/eventgroups/88808/categories/492/subcategories/4518?format=json"
        ).text)

    def helper(offer):
        print(json.dumps(offer))
        return offer

    return {
        team: [{
            "opp": event["opp"],
            "lines": {
                o2["label"]: [
                    o3["line"] for o3 in o2["outcomes"]
                    if team not in o3["label"] and "line" in o3
                ][0]
                for o2 in [
                    offer for o in lines["eventGroup"]["offerCategories"][0]
                    ["offerSubcategoryDescriptors"][0]["offerSubcategory"]
                    ["offers"] for offer in o
                    if offer["eventId"] == event["id"]
                ] if "label" in o2 and o2["label"] != "Moneyline"
            }
        } for event in [{
            "opp":
            opp,
            "id": [
                event["eventId"] for event in lines["eventGroup"]["events"]
                if team in event["name"] and opp in event["name"]
            ][0]
        } for opp in opps]]
        for team, opps in schedule.items()
    }


def get_results(
    vegas: typing.Dict[str,
                       typing.List[float]], ) -> typing.Dict[str, typing.Any]:
    return {}


if __name__ == "__main__":
    main()
