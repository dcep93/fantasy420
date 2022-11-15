#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
pipenv run python3 "$SCRIPT_DIR"/generate.py | tee "$SCRIPT_DIR"/generated.json