#!/bin/bash
set -e

rm -rf node_modules/graceful-fs
ln -s @n2liquid/graceful-fs node_modules

mkdir -p public/deps
cp node_modules/sw-toolbox/sw-toolbox.js public/deps

mkdir -p public/deps/photonkit
cp -r node_modules/photonkit/dist/{css,fonts} public/deps/photonkit

browserify public/sw-main.js -o public/sw-bundle.js
browserify -r fs:browserify-fs public/main.js -o public/bundle.js
