let through2 = require('through2');

div.fs = exports;

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
