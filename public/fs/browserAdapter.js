let Vinyl = require('vinyl');
let base64 = require('base64-js');
let bufFromStream = require('../helper/bufFromStream');
let minimatch = require('minimatch');
let path = require('path');
let through2 = require('through2');

div.fs.browser = exports;

exports.storage = localStorage;
exports.storagePrefix = 'vinyl:';

exports.src = (glob, opt) => {
  let ret = through2.obj();

  for (let k of exports.getKeys(glob)) {
    let filePath = k.slice(exports.storagePrefix.length);
    let e = JSON.parse(exports.storage.getItem(k));

    ret.push(new Vinyl({
      path: filePath,
      contents: Buffer.from(base64.toByteArray(e.contents)),
    }));
  }

  ret.end();

  return ret;
};

exports.dest =
  (outDirPath, opt) => through2.obj().on('data', file => {
    Promise.resolve(exports.storeFile(outDirPath, file))
      .catch(err => console.error(err));
  });

exports.getKeys = glob => {
  let keys = [];

  for (let i = 0; i < exports.storage.length; ++i) {
    let k = exports.storage.key(i);

    if (!k.startsWith(exports.storagePrefix)) {
      continue;
    }

    let filePath = k.slice(exports.storagePrefix.length);

    if (glob && !minimatch(filePath, glob)) {
      continue;
    }

    keys.push(k);
  }

  return keys;
};

exports.storeFile = (dirPath, file) => {
  let filePath = path.resolve(dirPath, file.basename);

  if (file.isBuffer()) {
    storeBuf(filePath, file.contents);
    return;
  }

  return bufFromStream(file.contents)
    .then(buf => storeBuf(filePath, buf));
};

exports.storeBuf = (filePath, bytes) => {
  exports.storage.setItem(
    `${exports.storagePrefix}${filePath}`, JSON.stringify({
      contents: base64.fromByteArray(bytes),
    }),
  );
};
