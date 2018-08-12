let fs = require('fs');
let fsp = fs.promises;
let path = require('path');

let prefix = '/api/fs';

exports.register = app => {
  app.get(`${prefix}*`, (req, res) => {
    let targetPath = req.path.slice(prefix.length);
    res.sendFile(targetPath);
  });

  app.post(`${prefix}*`, (req, res) => {
    let targetPath = req.path.slice(prefix.length);

    let writeStream = fs.createWriteStream(
      targetPath, req.query || {},
    );

    writeStream.on('error', err => res.send(err));

    writeStream.on('finish', () => {
      res.status(200).send();
    });

    req.pipe(writeStream);
  });
};
