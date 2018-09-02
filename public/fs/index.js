let Vinyl = require('vinyl');
let minimatch = require('minimatch');
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
  opt = opt || {};

  let cwd = (() => {
    if (!opt.cwd) {
      return '';
    }

    return opt.cwd.endsWith('/')
      ? opt.cwd
      : `${opt.cwd}/`;
  })();

  let fullGlob = `${cwd}${glob}`;
  let globParts = fullGlob.split('/');

  let globChunks = globParts.map(
    (_, i) => globParts.slice(0, i + 1).join('/'),
  );

  let mountPoints = Object.keys(exports.mountPointAdapters)
    .filter(mountPoint => globChunks.some(
      partialGlob => minimatch(mountPoint, partialGlob),
    ));

  let ret = through2.obj();

  if (!mountPoints.length) {
    ret.end();
    return ret;
  }

  let doneCount = 0;

  for (let mp of mountPoints) {
    if (minimatch(mp, fullGlob)) {
      let fileProps = { path: mp };

      if (opt.stat) {
        fileProps.stat = {
          isDirectory: () => true,
        };
      }

      ret.push(new Vinyl(fileProps));

      continue;
    }

    let mpGlob = (() => {
      // FIXME: Use a regular expression that checks for a
      // slash or end-of-string as well after mp in glob.
      if (!glob.startsWith(mp)) {
        return glob;
      }

      return glob.slice(mp.length);
    })();

    let mpOpt = {
      ...opt,

      cwd: (() => {
        // FIXME: Use a regular expression that checks for a
        // slash or end-of-string as well after mp in cwd.
        if (!cwd || !cwd.startsWith(mp)) {
          return cwd;
        }

        return cwd.slice(mp.length);
      })(),
    };

    exports.mountPointAdapters[mp].src(mpGlob, mpOpt)
      .on('error', err => {
        ret.destroy(err);
        // FIXME: Also close other adapter streams.
      })
      .on('data', f => {
        f.base = `${mp}${f.base}`;
        f.cwd = `${mp}${f.cwd}`;
        f.dirname = `${mp}${f.dirname}`;

        ret.push(f);
      })
      .on('end', () => {
        ++doneCount;

        if (doneCount >= mountPoints.length) {
          ret.end();
        }
      });
  }

  return ret;
};
