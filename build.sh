#!/bin/sh
set -e

rm -rf node_modules/graceful-fs
ln -s @n2liquid/graceful-fs node_modules

browserify -r fs:browserify-fs public/main.js -o public/bundle.js
