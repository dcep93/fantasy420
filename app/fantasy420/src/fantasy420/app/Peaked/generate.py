#! python3

# docker build -q . | xargs docker run --rm | tee generated.json

import json

from pydantic import BaseModel
import typing
import requests

import cv2
import numpy
import pytesseract

year = 2022
league_id = 203836968
peaked_url = '''
https://i0.wp.com/peakedinhighskool.com/wp-content/uploads/2022/09/1QB1.0PPR4pt_20220927.png?w=1790&ssl=1
'''
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
    image = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)
    text = pytesseract.image_to_string(image, config='--psm 6')
    return {"url": peaked_url, "text": text}


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
