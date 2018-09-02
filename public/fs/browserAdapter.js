let Vinyl = require('vinyl');
let base64 = require('base64-js');
let fromFile = require('../helper/fromFile');
let lf = require('localforage');
let minimatch = require('minimatch');
let path = require('path');
let through2 = require('through2');

div.fs.browser = exports;

exports.storagePrefix = 'vinyl:';

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

  let ret = through2.obj();

  (async () => {
    for (let k of await exports.getKeys(fullGlob)) {
      let filePath = k.slice(exports.storagePrefix.length);
      let fileProps = await lf.getItem(k);

      fileProps.path = filePath;

      fileProps.contents =
        fileProps.contents &&
        Buffer.from(fileProps.contents);

      let stat = fileProps.stat = fileProps.stat || {};

      for (let k of [
        'isDirectory',
      ]) {
        stat[k] = () => stat[`_${k}`];
      }

      ret.push(new Vinyl(fileProps));
    }

    ret.end();
  })()
  .catch(err => ret.destroy(err));

  return ret;
};

exports.dest =
  (outDirPath, opt) => through2.obj().on('data', file => {
    Promise.resolve(exports.storeFile(outDirPath, file))
      .catch(err => console.error(err));
  });

exports.getKeys = async glob => {
  return (await lf.keys()).filter(k => {
    if (!k.startsWith(exports.storagePrefix)) {
      return false;
    }

    let filePath = k.slice(exports.storagePrefix.length);

    return !glob || minimatch(filePath, glob);
  });
};

exports.mkdirp = async dirPath => {
  if (dirPath.startsWith('/')) {
    dirPath = dirPath.slice(1);
  }

  let dirPathParts = dirPath.split('/');

  let dirPathChunks = dirPathParts.map(
    (_, i) => dirPathParts.slice(0, i + 1).join('/'),
  );

  for (let dirPathChunk of dirPathChunks) {
    let k = `${exports.storagePrefix}/${dirPathChunk}`;

    let existing = await lf.getItem(k);

    if (existing) {
      let { stat } = existing;

      if (!stat || !stat._isDirectory) {
        throw new Error(
          `/${dirPathChunk} already exists and is not ` +
          `a directory`,
        );
      }
    }

    await lf.setItem(k, {
      stat: {
        _isDirectory: true,
      },
    });
  }
};

exports.storeFile = async (dirPath, file) => {
  let filePath = path.resolve(dirPath, file.basename);
  let k = `${exports.storagePrefix}${filePath}`;

  await exports.mkdirp(dirPath);

  await lf.setItem(k, {
    contents: await fromFile(file),
  });
};
