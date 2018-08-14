require('junior-ui/browserGlobal');

window.div = exports;

require('./apps');
require('./fs');
require('./helper/allFromStream');
require('./helper/bufFromStream');
require('./helper/fromFile');
require('./helper/oneFromStream');

div.base64 = require('base64-js');
div.through2 = require('through2');
