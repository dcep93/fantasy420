#!/bin/bash

cd -- "$( dirname -- "${BASH_SOURCE[0]}" )"
pipenv run python3 generate.py | tee generated.json
