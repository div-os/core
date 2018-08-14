let bufFromStream = require('./bufFromStream');

module.exports = div.fromFile = async (file, enc) => {
  if (file.isBuffer()) {
    return decode(file.contents, enc);
  }

  return decode(
    await bufFromStream(file.contents), enc,
  );
};

function decode(buf, enc) {
  if (!enc) {
    return buf;
  }

  return new TextDecoder(enc).decode(buf);
}
