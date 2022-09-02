import concurrent.futures
import json
import os
import requests
import typing

from bs4 import BeautifulSoup

NUM_WEEKS = 6

NUM_EXECUTORS = 8


def main():
    results = get_results()
    print(json.dumps(results, indent=1))


def get_results():
    team_names = get_team_names()
    dirname = os.path.dirname(os.path.realpath(__file__))
    path = os.path.join(dirname, "draft.json")
    with open(path) as fh:
        draft_json = json.load(fh)
    targeted_players = draft_json["drafts"][0][:80]
    with concurrent.futures.ThreadPoolExecutor(NUM_EXECUTORS) as executor:
        _compatibilities = executor.map(
            lambda team_name: get_compatibilities(team_name, targeted_players),
            team_names)
        compatibilities = list(_compatibilities)
    return {["good", "bad"][i]: [k for j in compatibilities for k in j[i]]
            for i in range(2)}


def get_team_names() -> typing.List[str]:
    resp = requests.get("https://www.espn.com/nfl/teams")
    soup = BeautifulSoup(resp.content, 'html.parser')
    hrefs = [
        i['href'] for i in soup.find_all('a', text='Depth Chart', href=True)
    ]
    return sorted([
        href.split("/")[-1] for href in hrefs
        if href.startswith("/nfl/team/depth")
    ])


def get_compatibilities(
    team_name: str, targeted_players: typing.List[str]
) -> typing.Tuple[typing.List[str], typing.List[str]]:
    print(team_name)
    url = f"https://www.espn.com/nfl/team/depth/_/name/{team_name}"
    resp = requests.get(url)
    soup = BeautifulSoup(resp.content, 'html.parser')
    rows = [list(r.children) for r in soup.find_all('tr')]

    def helper():
        for i, row in enumerate(rows):
            if row[0].text == "Starter":
                return rows[i + 1:][:5]
        raise Exception("no starter")

    rows = helper()

    qba = rows.pop(0)[0]
    qbname, qbsign = get_name_sign(qba)
    rval = [[], []]
    for row in rows:
        for td in row[:2]:
            if td.text == '- ':
                continue
            name = td.find('a').text
            if name not in targeted_players:
                continue
            name, sign = get_name_sign(td)
            direct_compatibility = get_direct_compatibility(qbsign, sign)
            s = f"{name} ({sign}) ({qbname} {qbsign}) : {direct_compatibility}"
            if direct_compatibility > 0:
                rval[0].append(s)
            elif direct_compatibility < 0:
                rval[1].append(s)
    return rval


def get_name_sign(td: BeautifulSoup) -> typing.Tuple[str, str]:
    a = td.find('a')
    url = a['href']
    resp = requests.get(url)
    soup = BeautifulSoup(resp.content, 'html.parser')
    bio = soup.find('ul', {"class": 'PlayerHeader__Bio_List'})
    full = list(bio.children)[1]
    rawbd = list(full.children)[1].text
    bd = rawbd.split(" ")[0]
    sign = get_sign(bd)
    return a.text, sign


def get_sign(bd: str) -> str:
    month, day, year = bd.split("/")
    day = int(day)
    if month == '12':
        astro_sign = 'sagittarius' if (day < 22) else 'capricorn'
    elif month == '1':
        astro_sign = 'capricorn' if (day < 20) else 'aquarius'
    elif month == '2':
        astro_sign = 'aquarius' if (day < 19) else 'pisces'
    elif month == '3':
        astro_sign = 'pisces' if (day < 21) else 'aries'
    elif month == '4':
        astro_sign = 'aries' if (day < 20) else 'taurus'
    elif month == '5':
        astro_sign = 'taurus' if (day < 21) else 'gemini'
    elif month == '6':
        astro_sign = 'gemini' if (day < 21) else 'cancer'
    elif month == '7':
        astro_sign = 'cancer' if (day < 23) else 'leo'
    elif month == '8':
        astro_sign = 'leo' if (day < 23) else 'virgo'
    elif month == '9':
        astro_sign = 'virgo' if (day < 23) else 'libra'
    elif month == '10':
        astro_sign = 'libra' if (day < 23) else 'scorpio'
    elif month == '11':
        astro_sign = 'scorpio' if (day < 22) else 'sagittarius'
    return astro_sign


# https://revivezone.com/zodiac709/zodiac-signs-compatibility-chart/
def get_direct_compatibility(qbsign: str, sign: str) -> float:
    return {
        "aries": {
            "aquarius": 1,
            "gemini": 1,
            "aries": 1,
            "virgo": 0.5,
            "scorpio": 0.5,
            "taurus": 0.5,
            "cancer": -1,
            "scorpio": -1,
            "libra": -1
        },
        "taurus": {
            "cancer": 1,
            "pisces": 1,
            "taurus": 1,
            "libra": 0.5,
            "sagittarius": 0.5,
            "gemini": 0.5,
            "aquarius": -1,
            "leo": -1,
            "scorpio": -1
        },
        "gemini": {
            "aries": 1,
            "leo": 1,
            "gemini": 1,
            "taurus": 0.5,
            "capricorn": 0.5,
            "scorpio": 0.5,
            "virgo": -1,
            "pisces": -1,
            "sagittarius": -1
        },
        "cancer": {
            "virgo": 1,
            "taurus": 1,
            "cancer": 1,
            "aquarius": 0.5,
            "sagittarius": 0.5,
            "leo": 0.5,
            "aries": -1,
            "libra": -1,
            "capricorn": -1
        },
        "leo": {
            "gemini": 1,
            "libra": 1,
            "leo": 1,
            "capricon": 0.5,
            "virgo": 0.5,
            "pisces": 0.5,
            "scorpio": -1,
            "aquarius": -1,
            "taurus": -1,
        },
        "virgo": {
            "scorpio": 1,
            "cancer": 1,
            "virgo": 1,
            "leo": 0.5,
            "aquarius": 0.5,
            "aries": 0.5,
            "gemini": -1,
            "sagittarius": -1,
            "pisces": -1
        },
        "libra": {
            "leo": 1,
            "sagittarius": 1,
            "libra": 1,
            "pisces": 0.5,
            "taurus": 0.5,
            "scorpio": 0.5,
            "capricorn": -1,
            "cancer": -1,
            "aries": -1
        },
        "scorpio": {
            "capricorn": 1,
            "virgo": 1,
            "scorpio": 1,
            "aries": 0.5,
            "sagittarius": 0.5,
            "leo": 0.5,
            "gemini": -1,
            "aquarius": -1,
            "taurus": -1
        },
        "libra": {
            "leo": 1,
            "sagittarius": 1,
            "libra": 1,
            "pisces": 0.5,
            "taurus": 0.5,
            "scorpio": 0.5,
            "capricorn": -1,
            "cancer": -1,
            "aries": -1
        },
        "sagittarius": {
            "aquarius": 1,
            "libra": 1,
            "sagittarius": 1,
            "capricorn": 0.5,
            "cancer": 0.5,
            "taurus": 0.5,
            "virgo": -1,
            "pisces": -1,
            "gemini": -1
        },
        "capricorn": {
            "pisces": 1,
            "scorpio": 1,
            "capricorn": 1,
            "aquarius": 0.5,
            "leo": 0.5,
            "gemini": 0.5,
            "libra": -1,
            "aries": -1,
            "cancer": -1,
        },
        "aquarius": {
            "sagittarius": 1,
            "aries": 1,
            "aquarius": 1,
            "virgo": 0.5,
            "cancer": 0.5,
            "pisces": 0.5,
            "scorpio": -1,
            "taurus": -1,
            "pisces": 0.5,
        },
        "pisces": {
            "capricorn": 1,
            "taurus": 1,
            "pisces": 1,
            "aries": 0.5,
            "gemini": 0.5,
            "libra": 0.5,
            "sagittarius": -1,
            "leo": -1,
            "virgo": -1
        },
    }.get(qbsign).get(sign, 0)


if __name__ == "__main__":
    main()
