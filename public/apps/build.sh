#!/bin/bash
set -e

for appName in *; do
  if [ ! -d "$appName" ]; then
    continue
  fi

  echo "Building apps/$appName..."
  cd "$appName"

  if [ ! -e package.json ]; then
    echo "Missing package.json." >/dev/stderr
    exit 1
  fi

  npm run build

  cd ..
done
