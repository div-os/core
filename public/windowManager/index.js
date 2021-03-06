let eventBus = require('../eventBus');

div.windowManager = module.exports = exports = {
  defaultFloatingWidth: 600,
  defaultFloatingHeight: 400,

  decorators: [],
  wnds: new Set(),

  lastZIndex: 0,

  create(opt) {
    opt = opt || {};

    if (opt.floating === undefined) {
      opt.floating = true;
    }

    let wnd = jr.createElement(`
      <div
        class="window"
        style="z-index: ${++exports.lastZIndex}"
      >
      </div>
    `);

    wnd.jr.setScope({ wnd });

    wnd.div = {};

    wnd.div.wm = {
      title: opt.title || '',

      args: opt.args,

      floatingWidth: opt.floatingWidth ||
        exports.defaultFloatingWidth,

      floatingHeight: opt.floatingHeight ||
        exports.defaultFloatingHeight,

      close() {
        let ev = new CustomEvent('div:wm:wndClose', {
          bubbles: true,
        });

        wnd.dispatchEvent(ev);

        if (ev.defaultPrevented) {
          return;
        }

        wnd.remove();
      },

      toggleFullscreen() {
        wnd.div.wm.fullscreen = !wnd.div.wm.fullscreen;

        this.updateClassList();

        wnd.dispatchEvent(new CustomEvent('resize', {
          bubbles: true,
        }));
      },

      toggleZoom() {
        let wndWmState = wnd.div.wm;

        if (!wndWmState.fullscreen) {
          for (let k of ['zoomed', 'floating']) {
            wndWmState[k] = !wndWmState[k];
          }
        }
        else {
          wndWmState.fullscreen = false;

          wndWmState.zoomed = true;
          wndWmState.floating = false;
        }

        this.updateClassList();

        wnd.dispatchEvent(new CustomEvent('resize', {
          bubbles: true,
        }));
      },

      updateClassList() {
        let classKeys = [
          'fullscreen',
          'zoomed',
          'floating',
        ];

        wnd.classList.remove(
          ...classKeys.map(k => `window--${k}`),
        );

        for (let k of classKeys) {
          if (!wnd.div.wm[k]) {
            continue;
          }

          wnd.classList.add(`window--${k}`);

          if (k === 'fullscreen') {
            break;
          }
        }
      },
    };

    if (opt.floating) {
      wnd.div.wm.floating = true;
      wnd.div.wm.updateClassList();

      wnd.style.left = '60px';
      wnd.style.top = '50px';
      wnd.style.width = `${wnd.div.wm.floatingWidth}px`;
      wnd.style.height = `${wnd.div.wm.floatingHeight}px`;
    }

    if (opt.stdHeader === undefined || opt.stdHeader) {
      let headerEl = jr.createElement(`
        <div class="
          window-stdHeader
          window-header
          window-handle
        ">
          <div class="window-stdHeaderLeftBox">
            <button
              class="
                window-stdHeaderBtn
                window-stdHeaderBtn--close
                icon
                icon-cancel
              "

              jr-on-click="wnd.div.wm.close()"
            ></button>

            <div class="window-stdHeaderContentBox">
            </div>
          </div>

          <div class="window-stdHeaderRightBox">
            <button
              class="
                window-stdHeaderBtn
                window-stdHeaderBtn--zoom
                icon
                icon-resize-full
              "

              jr-on-click="wnd.div.wm.toggleZoom()"
            ></button>
          </div>
        </div>
      `);

      wnd.appendChild(headerEl);

      wnd.div.wm.stdHeader = {
        getEl() {
          return wnd.jr.findFirst('.window-stdHeader');
        },

        getContentBoxEl() {
          return wnd.jr.findFirst(
            '.window-stdHeaderContentBox',
          );
        },

        getTitleEl() {
          return wnd.jr.findFirst('.window-stdTitle');
        },
      };

      if (opt.stdTitle === undefined || opt.stdTitle) {
        let titleEl = jr.createElement(`
          <div
            class="window-stdTitle window-title"
            jr-text-content.bind="wnd.div.wm.title"
          ></div>
        `);

        wnd.div.wm.stdHeader.getContentBoxEl()
          .appendChild(titleEl);
      }
    }

    if (opt.iframeSrc) {
      let iframeEl = document.createElement('iframe');

      iframeEl.div = {};
      iframeEl.div.wm = {};

      iframeEl.div.wm.parentWnd = wnd;

      iframeEl.classList.add('window-iframe');
      iframeEl.src = opt.iframeSrc;

      wnd.appendChild(iframeEl);
    }

    for (let decorator of exports.decorators) {
      decorator(wnd, opt);
    }

    jr.findFirst('.windowManager').appendChild(wnd);
    this.wnds.add(wnd);

    exports.activeWnd = wnd;

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

eventBus.on('viewport:resize', () => {
  for (let wnd of exports.wnds) {
    wnd.dispatchEvent(new CustomEvent('resize', {
      bubbles: true,
    }));
  }
});

document.addEventListener('mousedown', ev => {
  let wnd = ev.target.closest('.window');

  exports.activeWnd = wnd;

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

eventBus.on('div:shortcutKeyDown', ev => {
  let wnd = exports.activeWnd;

  if (!wnd || !document.contains(wnd)) {
    return;
  }

  switch (ev.key) {
    case 'x':
      wnd.div.wm.close();
      break;

    case 'f':
      wnd.div.wm.toggleFullscreen();
      break;

    case 'z':
      wnd.div.wm.toggleZoom();
      break;
  }
});
