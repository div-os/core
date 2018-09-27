let eventBus = require('./eventBus');

div.shortcutManager = exports;

exports.state = 'idle';

document.addEventListener('keydown', ev => {
  // Cancel shortcut if Escape is pressed.
  if (ev.code === 'Escape' && exports.state !== 'idle') {
    exports.state = 'idle';

    ev.preventDefault();
    ev.stopPropagation();

    return;
  }

  // Ignore non-alphanumeric keys.
  if (!ev.code.startsWith('Key')) {
    return;
  }

  // If the prefix shortcut is pressed...
  if (ev.ctrlKey && ev.key === 'b') {
    switch (exports.state) {
      // And the state is prefixOverflow, let the keyboard
      // event dispatch normally.
      case 'prefixOverflow':
        return;

      // And the state is prefixed, enter prefixOverflow
      // state and let the keyboard event dispatch
      // normally.
      case 'prefixed':
        exports.state = 'prefixOverflow';
        return;

      // Otherwise, enter prefixed state and block this
      // keyboard event's further dispatch.
      default:
        exports.state = 'prefixed';

        ev.preventDefault();
        ev.stopPropagation();

        return;
    }
  }

  // Otherwise (if any other non-alphanumeric key is
  // pressed...)
  switch (exports.state) {
    // And the state is prefixOverflow, enter idle state
    // and let the keyboard event dispatch normally.
    case 'prefixOverflow':
      exports.state = 'idle';
      return;

    // And the state is prefixed, enter idle state, block
    // this keyboard event's further dispatch, and emit
    // the div:shortcutKeyDown event on the desktop event
    // bus.
    case 'prefixed':
      exports.state = 'idle';

      ev.preventDefault();
      ev.stopPropagation();

      eventBus.emit('div:shortcutKeyDown', ev);
      jr.update();

      return;
  }
}, {
  capture: true,
});
