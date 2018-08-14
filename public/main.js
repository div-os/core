require('junior-ui/browserGlobal');

window.div = exports;

require('./helper/allFromStream');
require('./helper/oneFromStream');
require('./fs');

div.base64 = require('base64-js');
div.gulpDebug = require('gulp-debug');
div.gulpZip = require('gulp-zip');
div.through2 = require('through2');
