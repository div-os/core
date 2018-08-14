let allFromStream = require('./allFromStream');

module.exports = div.bufFromStream = async stream => {
  let chunks = await allFromStream(stream);

  let retLength = chunks.reduce(
    (x, buf) => x + buf.length, 0,
  );

  let ret = Buffer.alloc(retLength);
  let i = 0;

  for (let buf of chunks) {
    ret.set(buf, i);
    i += buf.length;
  }

  return ret;
};
