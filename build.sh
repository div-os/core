#!/bin/bash
set -e

mkdir -p public/deps
cp node_modules/sw-toolbox/sw-toolbox.js public/deps

mkdir -p public/deps/photonkit
cp -r node_modules/photonkit/dist/{css,fonts} public/deps/photonkit

cd public/apps/

for appName in *; do
  if [ ! -d "$appName" ]; then
    continue
  fi

  echo "Building apps/$appName..."
  cd "$appName"

  if [ -e package.json ]; then
    npm run build
  fi

  rm "$appName.zip" || true
  zip -r "$appName.zip" * -x "node_modules/*"

  cd ..
done

cd ../../

browserify public/sw-main.js -o public/sw-bundle.js
browserify -r fs:browserify-fs public/main.js -o public/bundle.js
