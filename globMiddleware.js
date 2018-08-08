let gs = require('glob-stream');
let map = require('map-stream');
let path = require('path');
let through2 = require('through2');

let prepareWrite = require('vinyl-fs/lib/dest/prepare');
let writeContents = require('vinyl-fs/lib/dest/write-contents');

let prefix = '/api/glob/';

exports.register = app => {
  app.get(`${prefix}*`, (req, res) => {
    let pattern = req.path.slice(prefix.length);
    let stream = gs(pattern, req.query || {});

    let procCwd = process.cwd();

    stream
      .pipe(map((d, cb) => {
        d.cwd = path.relative(procCwd, d.cwd);
        d.base = path.relative(procCwd, d.base);
        d.path = path.relative(procCwd, d.path);

        cb(null, JSON.stringify(d) + '\n');
      }))
      .pipe(res);
  });

  app.put(`${prefix}*`, (req, res) => {
    let targetDir = req.path.slice(prefix.length);
    let procCwd = process.cwd();

    let saveFile = (file, encoding, cb) => {
      prepareWrite(
        targetDir, file, req.query || {},

        (err, writePath) => {
          if (err) {
            return cb(err);
          }

          writeContents(writePath, file, cb);
        },
      );
    };

    req.pipe(through2.obj(saveFile));
  });
};
