#! python3

# docker build -q . | xargs docker run --rm | tee generated.json

import json
import typing

from pydantic import BaseModel
import requests

import cv2
import numpy
import pytesseract

year = 2023
league_id = 203836968
# https://i0.wp.com/peakedinhighskool.com/wp-content/uploads/2022/09/1QB1.0PPR4pt_20220927.png?w=1790&ssl=1
# https://pbs.twimg.com/media/FeTjnmBXEAI5EM6?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/Fe3mDJPXkAIn2Sj?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/FfbqE5qX0AA-fyV?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/Ff_tdS8XoAAaJom?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/FgjwqEJWAAEG3gD?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/FhIBPX7XwAIrrtP?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/FhsEGsOX0AEmDG_?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/FiQHR-LXkAAulRr?format=jpg&name=4096x4096
# https://pbs.twimg.com/media/Fi0KaTHXEAE0YmF?format=jpg&name=4096x4096
peaked_url = '''
https://pbs.twimg.com/media/F3qfLwaXkAAtGoc?format=jpg&name=4096x4096
'''.strip()
teams_url = f"https://fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}?view=mRoster&view=mTeam"


class Team(BaseModel):
    name: str
    players: typing.List[str]


def main():
    peaked = get_peaked()
    teams = get_teams()
    dumped = json.dumps({"peaked": peaked, "teams": teams})
    print(dumped)


def get_peaked() -> str:
    raw = requests.get(peaked_url).content
    data = numpy.frombuffer(raw, dtype='uint8')
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    text = pytesseract.image_to_string(image, config='--psm 6')
    lines = text.split("\n")
    return {"url": peaked_url, "lines": lines}


def get_teams() -> typing.List[Team]:
    raw = requests.get(teams_url).json()
    return [{
        "name":
        f'{t["location"]} {t["nickname"]}',
        "players": [
            i["playerPoolEntry"]["player"]["fullName"]
            for i in t["roster"]["entries"]
        ],
    } for t in raw["teams"]]


if __name__ == "__main__":
    main()
