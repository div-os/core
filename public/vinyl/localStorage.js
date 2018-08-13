let Vinyl = require('vinyl');
let base64 = require('base64-js');
let minimatch = require('minimatch');
let through2 = require('through2');

localStorage.setItem('vinyl:/derp.txt', JSON.stringify({
  contents: base64.fromByteArray(
    new TextEncoder('utf-8').encode(`Hello, world!`),
  ),
}));

let lsItemPrefix = 'vinyl:';

exports.getKeys = glob => {
  let keys = [];

  for (let i = 0; i < localStorage.length; ++i) {
    let k = localStorage.key(i);

    if (!k.startsWith(lsItemPrefix)) {
      continue;
    }

    let filePath = k.slice(lsItemPrefix.length);

    if (glob && !minimatch(filePath, glob)) {
      continue;
    }

    keys.push(k);
  }

  return keys;
};

exports.src = (glob, opt) => {
  let ret = through2.obj();

  for (let k of exports.getKeys(glob)) {
    let filePath = k.slice(lsItemPrefix.length);
    let e = JSON.parse(localStorage.getItem(k));

    ret.push(new Vinyl({
      path: filePath,
      contents: Buffer.from(base64.toByteArray(e.contents)),
    }));
  }

  return ret;
};
