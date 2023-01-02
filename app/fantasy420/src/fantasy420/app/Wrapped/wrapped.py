import concurrent.futures

import json
import requests
import sys

from bs4 import BeautifulSoup

year = 2022
league_ids = [203836968]

num_threads = 32

fetch_cache = {}

# for private leagues, need to store the cookie value of espn_s2 in espn_s2.txt
try:
    with open('espn_s2.txt') as fh:
        espn_s2 = fh.read().strip()
except:
    espn_s2 = None


class Vars:
    max_week_finished = 17


def main():
    wrapped = {}
    for league_id in league_ids:
        wrapped[league_id] = get_wrapped(league_id)
    print(json.dumps(wrapped))


def get_wrapped(league_id):
    team_names = get_team_names(league_id)
    weeks = get_weeks(league_id, len(team_names))
    populate_boxscores(weeks)
    populate_fieldgoals(weeks)
    players = get_players(weeks)
    return {"teamNames": team_names, "weeks": weeks, "players": players}


def fetch(url, decode_json=True):
    if url in fetch_cache:
        return fetch_cache[url]
    sys.stderr.write(url)
    raw_data = requests.get(url, cookies={'espn_s2': espn_s2})
    data = raw_data.json() if decode_json else raw_data.text
    fetch_cache[url] = data
    return data


def get_team_names(league_id):
    data = fetch(
        f"https://fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}?view=mTeam"
    )
    return list(
        map(
            lambda team: f'{team["location"]} {team["nickname"]}',
            data["teams"],
        ), )


def get_weeks(league_id, num_teams):
    with concurrent.futures.ThreadPoolExecutor(num_threads) as executor:
        weeks = list(
            executor.map(
                lambda key: get_matches(league_id, key + 1, num_teams),
                list(range(Vars.max_week_finished)),
            ))
    weeks = [week for week in weeks if week]
    return weeks


def get_matches(league_id, week_num, num_teams):
    if week_num > Vars.max_week_finished:
        return None
    url = f"https://fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}?view=mScoreboard&scoringPeriodId={week_num}"
    data = fetch(url)
    raw_matches = filter(
        lambda match: "rosterForCurrentScoringPeriod" in match["away"],
        data["schedule"],
    )
    matches = []
    for match in raw_matches:
        teams = list(map(
            get_team,
            [match["home"], match["away"]],
        ))
        matches.append(sorted(
            teams,
            key=lambda team: team["score"],
        ))
    if len(matches) != num_teams / 2 or matches[0][0]["score"] == 0:
        if Vars.max_week_finished > week_num:
            Vars.max_week_finished = week_num
        return None
    return {"number": week_num, "matches": matches}


def get_team(raw_team):
    pro_team_names = {
        0: 'FA',
        1: 'Atl',
        2: 'Buf',
        3: 'Chi',
        4: 'Cin',
        5: 'Cle',
        6: 'Dal',
        7: 'Den',
        8: 'Det',
        9: 'GB',
        10: 'Ten',
        11: 'Ind',
        12: 'KC',
        13: 'LV',
        14: 'LAR',
        15: 'Mia',
        16: 'Min',
        17: 'NE',
        18: 'NO',
        19: 'NYG',
        20: 'NYJ',
        21: 'Phi',
        22: 'Ari',
        23: 'Pit',
        24: 'LAC',
        25: 'SF',
        26: 'Sea',
        27: 'TB',
        28: 'Wsh',
        29: 'Car',
        30: 'Jax',
        33: 'Bal',
        34: 'Hou',
    }
    lineup = []
    for player in raw_team["rosterForMatchupPeriod"]["entries"]:
        scoring_players = list(
            filter(
                lambda scoring_player: scoring_player["playerId"] == player[
                    "playerId"],
                raw_team["rosterForCurrentScoringPeriod"]["entries"],
            ))
        if scoring_players and scoring_players[0]["lineupSlotId"] not in [
                20, 21
        ]:
            lineup.append(player["playerId"])
    roster = []
    for raw_player in raw_team["rosterForCurrentScoringPeriod"]["entries"]:
        player = raw_player["playerPoolEntry"]["player"]
        player_obj = {
            "id": player["id"],
            "name": player["fullName"],
            "score":
            get_points(raw_player["playerPoolEntry"]["appliedStatTotal"]),
            "position": player["defaultPositionId"],
            "team": pro_team_names[player["proTeamId"]].upper(),
        }
        if player_obj["name"] == "Rodrigo Blankenship":
            player_obj["team"] = "IND"
        roster.append(player_obj)
    score = get_points(
        sum([player["score"] for player in roster if player["id"] in lineup]))
    return {
        "teamIndex": raw_team["teamId"] - 1,
        "score": score,
        "lineup": [str(i) for i in lineup],
        "fullRoster": roster,
    }


def get_game_id(pro_team_name, week):
    url = f'https://www.espn.com/nfl/team/schedule/_/name/{pro_team_name}'
    schedule_html = fetch(url, decode_json=False)
    soup = BeautifulSoup(schedule_html, features="html.parser")
    t = soup.find("table")
    for row in t.findAll("tr"):
        if row.find("span") and row.find("span").text == str(week):
            hrefs = row.findAll("a", href=True)
            if len(hrefs) < 3:
                return None
            game_url = hrefs[2]["href"]
            return game_url.split("espn.com/nfl/game/_/gameId/")[-1]


def populate(weeks, week_key, f, position):
    to_fetch = []
    for week in weeks:
        for match in week["matches"]:
            for team in match:
                for player in team["fullRoster"]:
                    if player["position"] == position:
                        if player["team"] != "FA":
                            key = (player["team"], week["number"])
                            to_fetch.append(key)

    with concurrent.futures.ThreadPoolExecutor(num_threads) as executor:
        fetched_arr = list(executor.map(lambda g: f(*g), to_fetch))
    for week in weeks:
        week[week_key] = [
            i for i in [
                fetched_arr[i] for i, j in enumerate(to_fetch)
                if j[1] == week["number"]
            ] if i
        ]


def populate_boxscores(weeks):
    populate(weeks, "boxscores", get_boxscore, 16)  # DST = 16


def get_boxscore(pro_team_name, week):
    game_id = get_game_id(pro_team_name, week)
    if game_id is None: return None
    url = f'https://www.espn.com/nfl/boxscore/_/gameId/{game_id}'
    box_score_html = fetch(url, decode_json=False)
    __espnfitt__ = box_score_html.split("window['__espnfitt__']=")[-1].split(
        ";</script>\n")[0]
    parsed = json.loads(__espnfitt__)
    gamepackage = parsed["page"]["content"]["gamepackage"]

    bxscr = gamepackage["bxscr"]
    teamabbrevs = [i["tm"]["abbrev"] for i in bxscr]
    key = 1 - teamabbrevs.index(pro_team_name)

    stats = bxscr[key]["stats"]
    passing = float(
        next((s["ttls"][1] for s in stats if "passingYards" in s["keys"]),
             None))
    rushing = float(
        next((s["ttls"][1] for s in stats if "rushingYards" in s["keys"]),
             None))

    score = int(gamepackage["gmStrp"]["tms"][key]["score"])

    boxscore = {
        "team": teamabbrevs[1 - key],
        "oppTeam": pro_team_name,
        "passing": passing,
        "rushing": rushing,
        "score": score
    }

    return boxscore


def populate_fieldgoals(weeks):
    populate(weeks, "fieldgoals", get_fieldgoals, 5)  # K = 5


def get_fieldgoals(pro_team_name, week):
    game_id = get_game_id(pro_team_name, week)
    if game_id is None: return None
    url = f'https://www.espn.com/nfl/playbyplay/_/gameId/{game_id}'
    play_by_play_html = fetch(url, decode_json=False)
    soup = BeautifulSoup(play_by_play_html, features="html.parser")
    headline_divs = soup.findAll("div", class_="headline")
    headlines = [h.text for h in headline_divs if "Field Goal" in h.text]
    return {"team": pro_team_name, "fieldgoals": headlines}


def get_players(weeks):
    players = {}
    for week in weeks:
        for match in week["matches"]:
            for team in match:
                roster = {}
                for p in team["fullRoster"]:
                    players[p["id"]] = {
                        "name": p["name"],
                        "position": p["position"],
                        "team": p["team"]
                    }
                    roster[p["id"]] = p["score"]
                team["roster"] = roster
                del team["fullRoster"]
    return players


def get_points(raw_points):
    return round(raw_points, 2)


main()