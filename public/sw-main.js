importScripts('deps/sw-toolbox.js');

let extName = require('ext-name');
let fileType = require('file-type');
let lf = require('localforage');

toolbox.router.get('/browser/(.*)', async (req, values) => {
  let filePath = values[0];
  let e = await lf.getItem(`vinyl:/${filePath}`);

  if (!e) {
    return new Response(null, {
      status: 404,
      statusText: 'Not found',
    });
  }

  let mimeFromBuf = fileType(e.contents);
  mimeFromBuf = mimeFromBuf && mimeFromBuf.mime;

  let mimeFromExt = extName(filePath)[0];
  mimeFromExt = mimeFromExt && mimeFromExt.mime;

  return new Response(e.contents, {
    headers: {
      'Content-Type': mimeFromBuf || mimeFromExt,
    },
  });
});
