div.windowManager = module.exports = exports = {
  decorators: [],

  lastZIndex: 0,

  create(opt) {
    opt = opt || {};

    if (opt.floating === undefined) {
      opt.floating = true;
    }

    let wnd = document.createElement('div');

    wnd.div = {};
    wnd.div.wm = {};

    wnd.classList.add('window');
    wnd.style.zIndex = ++exports.lastZIndex;

    if (opt.floating) {
      wnd.classList.add('window--floating');
      wnd.style.width = '900px';
      wnd.style.height = '500px';
      wnd.style.left = '60px';
      wnd.style.top = '50px';
    }

    if (opt.title) {
      let headerEl = document.createElement('div');
      let titleEl = document.createElement('div');

      headerEl.classList.add('window-header', 'window-handle');

      titleEl.classList.add('window-title');
      titleEl.textContent = opt.title;

      headerEl.appendChild(titleEl);
      wnd.appendChild(headerEl);
    }

    if (opt.iframeSrc) {
      let iframeEl = document.createElement('iframe');

      iframeEl.classList.add('window-iframe');
      iframeEl.src = opt.iframeSrc;

      wnd.appendChild(iframeEl);
    }

    for (let decorator of exports.decorators) {
      decorator(wnd, opt);
    }

    jr.findFirst('.windowManager').appendChild(wnd);

    requestAnimationFrame(() => exports.update());

    return wnd;
  },

  Resizable: require('resizable'),

  update() {
    for (let wnd of jr.find('.window')) {
      wnd.div = wnd.div || {};
      wnd.div.wm = wnd.div.wm || {};

      if (wnd.div.wm.dragCtrl) {
        continue;
      }

      wnd.div.wm.resizableCtrl = new exports.Resizable(wnd, {
        draggable: {
          handle: jr(wnd).jr.findFirst('.window-handle'),
        },
      });
    }
  },
};

document.addEventListener('mousedown', ev => {
  let wnd = ev.target.closest('.window');

  if (!wnd) {
    return;
  }

  if (
    !wnd.style.zIndex ||
    Number(wnd.style.zIndex) < exports.lastZIndex
  ) {
    wnd.style.zIndex = ++exports.lastZIndex;
  }
});
