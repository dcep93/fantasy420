#!/bin/bash

set -euo pipefail

cd app/fantasy420
npm install
yarn build
rm -rf node_modules
