#!/bin/bash
set -e

APP_DIR_NAME="${PWD##*/}"

BUNDLE_OUT="bundle.js"
BUNDLE_TMP=".$BUNDLE_OUT-$BASHPID"

browserify app.js -o "$BUNDLE_TMP"

function rm_bundle_tmp {
  rm "$BUNDLE_TMP" || true
}

trap rm_bundle_tmp EXIT

if cmp -s "$BUNDLE_OUT" "$BUNDLE_TMP"; then
  exit
fi

mv "$BUNDLE_TMP" "$BUNDLE_OUT"

rm "$APP_DIR_NAME.zip" || true
zip -r "$APP_DIR_NAME.zip" * -x "node_modules/*"
