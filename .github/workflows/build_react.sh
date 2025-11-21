#!/bin/bash

# npm create vite@latest app -- --template react-ts

set -euo pipefail

cd app/fantasy420
npm install
yarn build
rm -rf node_modules
