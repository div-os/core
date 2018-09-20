require('junior-ui/browserGlobal');

window.div = exports;

(async () => {
  let swReg = await navigator.serviceWorker
    .register('sw-bundle.js');

  let pongRes = await fetch('sw-ping');

  if (!pongRes.ok || await pongRes.text() !== 'Pong') {
    alert(
      `The ServiceWorker is not responding. Please ` +
      `soft-refresh the page.`,
    );

    div.panic = true;
    jr.update();

    return;
  }

  div.swReg = swReg;
  jr.update();
})()
.catch(err => console.error(err));

exports.bodyScope = {};

// Non-UI 3rd-party modules.
div.base64 = require('base64-js');
div.lf = require('localforage');
div.through2 = require('through2');

// Non-UI modules.
require('./apps');
require('./eventBus');
require('./fs');
require('./helper/allFromStream');
require('./helper/bufFromStream');
require('./helper/fromFile');
require('./helper/oneFromStream');
require('./scriptManager');
require('./viewportManager');

// UI modules.
require('./env');
require('./launcher');
require('./windowManager');
require('./workspaceManager');

(async () => {
  for (let name of [
    'files',
    'helloSvg',
    'metal',
  ]) {
    try {
      let path = `apps/${name}/${name}.zip`;

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
