let eventBus = require('./eventBus');

div.desktopMenu = exports;

exports.isHidden = false;

eventBus.on('div:shortcutKeyDown', ev => {
  if (ev.ctrlKey || ev.altKey || ev.key !== 'b') {
    return;
  }

  exports.isHidden = !exports.isHidden;
});
