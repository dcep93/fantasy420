#!/bin/bash


cd -- "$( dirname -- "${BASH_SOURCE[0]}" )"
docker build .
docker run --rm -it $(docker build -q .) | tee generated.json

