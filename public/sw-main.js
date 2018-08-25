importScripts('deps/sw-toolbox.js');

let extName = require('ext-name');
let fileType = require('file-type');
let lf = require('localforage');

self.addEventListener('activate', ev => {
  ev.waitUntil(self.clients.claim());
});

let pingHandler = () => {
  return new Response('Pong');
};

toolbox.router.get('sw-ping', pingHandler);
toolbox.router.get('/sw-ping', pingHandler);

let lfHandler = async (req, values) => {
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
};

toolbox.router.get('browser/(.*)', lfHandler);
toolbox.router.get('/browser/(.*)', lfHandler);
