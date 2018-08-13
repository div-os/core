let through2 = require('through2');

module.exports = window.vfs = {
  backendClient: require('./backendClient'),

  mountPointAdapters: {
    '/backend': require('./backendClient'),
  },

  src: (glob, opt) => {
    let mountPoint = Object.keys(vfs.mountPointAdapters)
      .find(prefix => glob.startsWith(`${prefix}/`));

    if (!mountPoint) {
      return through2().end();
    }

    let adapter = vfs.mountPointAdapters[mountPoint];

    return adapter.src(glob.slice(mountPoint.length), opt);
  },
};
