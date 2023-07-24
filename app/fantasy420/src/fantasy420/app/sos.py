import concurrent.futures
import json
import requests
import typing

from bs4 import BeautifulSoup

NUM_EXECUTORS = 8


def main():
    results = get_results()
    print(json.dumps(results))


def get_results():
    team_names = get_team_names()
    points_against = get_points_against()
    with concurrent.futures.ThreadPoolExecutor(NUM_EXECUTORS) as executor:
        _predictions = executor.map(
            lambda team_name: get_prediction(team_name, points_against),
            team_names)
        predictions = list(_predictions)
    return {
        team_name: predictions[i]
        for i, team_name in enumerate(team_names)
    }


def get_team_names() -> typing.List[str]:
    resp = requests.get("https://www.espn.com/nfl/teams")
    soup = BeautifulSoup(resp.content, 'html.parser')
    hrefs = [i['href'] for i in soup.find_all('a', text='Schedule', href=True)]
    return sorted([
        href.split("/")[-1] for href in hrefs
        if href.startswith("/nfl/team/schedule")
    ])


def get_points_against() -> typing.Dict[str, float]:
    url = "https://fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/203836968?view=mPositionalRatingsStats"
    resp = requests.get(url)
    j = json.loads(resp.content)
    ratingsByOpponent = j["positionAgainstOpponent"]["positionalRatings"][
        "16"]["ratingsByOpponent"]
    proTeamsById = [
        "atl",
        "buf",
        "chi",
        "cin",
        "cle",
        "dal",
        "den",
        "det",
        "gb",
        "ten",
        "ind",
        "kc",
        "lv",
        "lar",
        "mia",
        "min",
        "ne",
        "no",
        "nyg",
        "nyj",
        "phi",
        "ari",
        "pit",
        "lac",
        "sf",
        "sea",
        "tb",
        "wsh",
        "car",
        "jax",
        None,
        None,
        "bal",
        "hou",
    ]

    return {
        proTeamsById[int(k) - 1]: v["average"]
        for k, v in ratingsByOpponent.items()
    }


def get_prediction(
    team_name: str,
    points_against: typing.Dict[str, float],
) -> typing.List[typing.Any]:
    print(team_name)
    url = f"https://www.espn.com/nfl/team/schedule/_/name/{team_name}"
    resp = requests.get(url)
    soup = BeautifulSoup(resp.content, 'html.parser')
    rows = [list(r.children) for r in soup.find_all('tr')]
    weeks = {
        week: opponent.find('a', href=True)["href"].split("/")[5]
        for week, opponent in [(int(week), opponent)
                               for week, opponent in [(r[0].text, r[2])
                                                      for r in rows
                                                      if len(r) > 2]
                               if week not in ['WK', 'HOF']]
    }
    return [{
        "p": points_against[o],
        "o": o
    } if o else None for o in [weeks.get(w) for w in [14, 15, 16, 17]]]


if __name__ == "__main__":
    main()
