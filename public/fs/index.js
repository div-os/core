let Vinyl = require('vinyl');
let through2 = require('through2');

// FIXME: Where should this be coming from? Lack of it
// breaks gulp-unzip.
Vinyl.prototype.pipe = function (...args) {
  return this.contents.pipe(...args);
};

div.fs = exports;

exports.gulpDebug = require('gulp-debug');
exports.gulpUnzip = require('gulp-unzip');
exports.gulpZip = require('gulp-zip');

require('./browserAdapter');
require('./backendAdapter');

exports.mountPointAdapters = {
  '/browser': exports.browser,
  '/backend': exports.backend,
};

exports.src = (glob, opt) => {
  let mountPoint = Object.keys(exports.mountPointAdapters)
    .find(prefix => glob.startsWith(`${prefix}/`));

  if (!mountPoint) {
    let ret = through2();
    ret.end();

    return ret;
  }

  let adapter = exports.mountPointAdapters[mountPoint];
  return adapter.src(glob.slice(mountPoint.length), opt);
};
