import concurrent.futures
import json
import requests
import typing

from bs4 import BeautifulSoup

NUM_WEEKS = 6

NUM_EXECUTORS = 8


def main():
    results = get_results()
    print(json.dumps(results))


def get_results():
    team_names = get_team_names()
    with concurrent.futures.ThreadPoolExecutor(NUM_EXECUTORS) as executor:
        _predictions = executor.map(get_prediction, team_names)
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


def get_prediction(team_name: str) -> typing.List[typing.Any]:
    print(team_name)
    url = f"https://www.espn.com/nfl/team/schedule/_/name/{team_name}"
    resp = requests.get(url)
    soup = BeautifulSoup(resp.content, 'html.parser')
    rows = [list(r.children) for r in soup.find_all('tr')]
    cells = [r[3] for r in rows if len(r) >= 3]

    def get_game_links(cells):
        for i in range(len(cells)):
            if cells[i].text == 'TIME':
                limited_cells = cells[i + 1:][:NUM_WEEKS]
                return [c.find('a')['href'] for c in limited_cells]

    game_links = get_game_links(cells)

    def get_span_text(soup: BeautifulSoup, class_name: str) -> str:
        found = soup.find("span", {"class": class_name})
        assert found is not None
        return found.text

    def helper(link: str):
        soup = get_game_soup(link)

        raw_home_prob = get_span_text(soup, "value-home")
        home_prob = float(raw_home_prob[:-1])

        raw_away_prob = get_span_text(soup, "value-away")
        away_prob = float(raw_away_prob[:-1])

        home_team = get_span_text(soup, "home-team")
        away_team = get_span_text(soup, "away-team")

        # these are flipped in the page
        # home_prob, away_prob = away_prob, home_prob
        home_team, away_team = away_team, home_team

        if team_name == home_team.lower():
            probability = home_prob / (home_prob + away_prob)
            opponent = f"vs {away_team}"
        else:
            probability = away_prob / (home_prob + away_prob)
            opponent = f"@ {home_team}"
        return {"p": probability, "o": opponent}

    return [helper(i) for i in game_links]


def memoize(f):
    d = {}

    def g(*args):
        if args in d:
            return d[args]
        v = f(*args)
        d[args] = v
        return v

    return g


@memoize
def get_game_soup(link: str) -> BeautifulSoup:
    resp = requests.get(link)
    soup = BeautifulSoup(resp.content, 'html.parser')
    return soup


if __name__ == "__main__":
    main()
