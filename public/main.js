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

// UI modules.
require('./desktopWorkspaces');
require('./windowManager');
