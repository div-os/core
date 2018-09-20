let eventBus = require('./eventBus');

div.viewportManager = exports;

let monitorSize = () => {
  requestAnimationFrame(monitorSize);

  let { width, height } = visualViewport;

  if (!exports.size) {
    exports.size = { width, height };
    return;
  }

  if (
    exports.size.width === width
    && exports.size.height === height
  ) {
    return;
  }

  Object.assign(exports.size, { width, height });
  eventBus.emit('viewport:resize', { ...exports.size });
};

monitorSize();
