let fsp = require('fs-promise-native');
let gs = require('glob-stream');
let map = require('map-stream');
let path = require('path');

let stat = async (...args) => {
  let ret = await fsp.stat(...args);

  for (let k of [
    'isDirectory',
  ]) {
    ret[`_${k}`] = ret[k]();
  }

  return ret;
};

exports.register = app => {
  app.get(`/api/glob`, (req, res) => {
    let opt = { ...req.query };

    let { pattern } = opt;
    delete opt.pattern;

    for (let k of ['stat']) {
      opt[k] = opt[k] && JSON.parse(opt[k]);
    }

    let stream = gs(pattern, opt);

    stream
      .pipe(map(async (d, cb) => {
        try {
          cb(null, JSON.stringify({
            ...d,
            stat: opt.stat && await stat(d.path),
          }) + '\n');
        }
        catch (err) {
          cb(err);
        }
      }))
      .pipe(res);
  });
};
