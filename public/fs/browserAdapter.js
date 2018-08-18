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
  let ret = through2.obj();

  (async () => {
    for (let k of await exports.getKeys(glob)) {
      let filePath = k.slice(exports.storagePrefix.length);
      let e = await lf.getItem(k);

      ret.push(new Vinyl({
        path: filePath,
        contents: Buffer.from(e.contents),
      }));
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

exports.storeFile = async (dirPath, file) => {
  let filePath = path.resolve(dirPath, file.basename);
  let k = `${exports.storagePrefix}${filePath}`;

  await lf.setItem(k, {
    contents: await fromFile(file),
  });
};
