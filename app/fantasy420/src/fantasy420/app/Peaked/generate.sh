#!/bin/bash

docker run --rm -it $(docker build -q .) | tee /dev/tty | pbcopy

