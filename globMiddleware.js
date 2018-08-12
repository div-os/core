let gs = require('glob-stream');
let map = require('map-stream');
let path = require('path');

let prefix = '/api/glob';

exports.register = app => {
  app.get(`${prefix}*`, (req, res) => {
    let pattern = req.path.slice(prefix.length);
    let stream = gs(pattern, req.query || {});

    stream
      .pipe(map((d, cb) => cb(null, JSON.stringify(d) + '\n')))
      .pipe(res);
  });
};
