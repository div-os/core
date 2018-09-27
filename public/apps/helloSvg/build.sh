#!/bin/bash
set -e

APP_DIR_NAME="${PWD##*/}"

rm "$APP_DIR_NAME.zip" || true
zip -r "$APP_DIR_NAME.zip" * -x "node_modules/*"
