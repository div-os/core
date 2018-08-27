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
  let cwd = (() => {
    if (!opt.cwd) {
      return '';
    }

    return opt.cwd.endsWith('/')
      ? opt.cwd
      : `${opt.cwd}/`;
  })();

  let fullGlob = `${cwd}${glob}`;

  let mountPoint = Object.keys(exports.mountPointAdapters)
    .find(prefix => fullGlob.startsWith(`${prefix}/`));

  if (!mountPoint) {
    let ret = through2();
    ret.end();

    return ret;
  }

  if (cwd) {
    opt = {
      ...opt,
      cwd: opt.cwd.slice(mountPoint.length),
    };
  }
  else {
    glob = glob.slice(mountPoint.length);
  }

  let adapter = exports.mountPointAdapters[mountPoint];

  return adapter.src(glob, opt)
    .pipe(through2.obj((d, enc, cb) => {
      d.base = `${mountPoint}${d.base}`;
      d.cwd = `${mountPoint}${d.cwd}`;
      d.dirname = `${mountPoint}${d.dirname}`;

      cb(null, d);
    }));
};
