#!/bin/sh
set -e

rm -rf node_modules/graceful-fs
ln -s @n2liquid/graceful-fs node_modules

cp node_modules/sw-toolbox/sw-toolbox.js public

browserify public/sw-main.js -o public/sw-bundle.js
browserify -r fs:browserify-fs public/main.js -o public/bundle.js
