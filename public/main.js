require('junior-ui/browserGlobal');

window.div = exports;

(async () => {
  div.swReg = await navigator.serviceWorker
    .register('sw-bundle.js');
})()
.catch(err => console.error(err));

exports.bodyScope = {};

// Non-UI 3rd-party modules.
div.base64 = require('base64-js');
div.lf = require('localforage');
div.through2 = require('through2');

// Non-UI modules.
require('./apps');
require('./fs');
require('./helper/allFromStream');
require('./helper/bufFromStream');
require('./helper/fromFile');
require('./helper/oneFromStream');
require('./scriptManager');

// UI modules.
require('./desktopWorkspaces');
require('./launcher');
require('./windowManager');

(async () => {
  for (let name of ['files', 'helloSvg']) {
    try {
      let path = `apps/samples/${name}/${name}.zip`;

      console.warn(`Fetching and installing ${path}...`);
      await div.apps.fetchAndInstall(path);

      console.warn(`Installed: /browser/apps/${name}`);
    }
    catch (err) {
      console.error(err);
    }
  }
})()
.catch(err => console.error(err));
