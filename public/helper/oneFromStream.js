let allFromStream = require('./allFromStream');

module.exports = div.oneFromStream =
  stream => allFromStream(stream).then(xs => xs[0]);
