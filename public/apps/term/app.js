let throttle = require('lodash.throttle');

let { appCtrl } = document.currentScript.div;

appCtrl.launch = async function (...args) {
  let app = new TermApp();
  await app.launch(...args);

  return app;
};

appCtrl.scriptAttached.resolve();

class TermApp {
  constructor() {
    this.fit = throttle(this.fit.bind(this), 200);
  }

  async launch(...args) {
    let xtermPath = 'node_modules/xterm/dist';

    await Promise.all([
      div.scriptManager.loadStylesheet(
        'https://fonts.googleapis.com/css?family=Source+Code+Pro',
      ),

      div.scriptManager.loadStylesheet(
        `${xtermPath}/xterm.css`,
      ),

      div.scriptManager.loadStylesheet(
        `${appCtrl.path}/styles.css`,
      ),

      (async () => {
        await div.scriptManager.load(
          `${xtermPath}/xterm.js`,
        );

        await div.scriptManager.load(
          `${xtermPath}/addons/attach/attach.js`,
        );
      })(),
    ]);

    Terminal.applyAddon(attach);

    this.wnd = jr(this.createWindow());

    try {
      this.wnd.jr.scope.termApp = this;

      this.ctrl = new Terminal();

      this.ctrl.open(
        this.wnd.jr.findFirst('.termApp_innerContainer'),
      );

      this.ctrl.setOption('rendererType', 'dom');

      this.ctrl.setOption('theme', {
        black: '#7F7F7F',
        red: '#E15A60',
        green: '#99C794',
        yellow: '#ffe2a9',
        blue: '#6796e6',
        magenta: '#C594C5',
        cyan: '#5FB3B3',
        white: '#d0d0d0',
        brightBlack: '#808080',
        brightRed: '#f1a5ab',
        brightGreen: '#a9cfa4',
        brightYellow: '#ffe2a9',
        brightBlue: '#6699CC',
        brightMagenta: '#C594C5',
        brightCyan: '#91c5d3',
        brightWhite: '#d4d4d4',
      });

      this.fit();

      await new Promise(
        resolve => requestAnimationFrame(resolve),
      );

      await this.connect();

      // FIXME: Use this.socket instead to decrease
      // latency and eliminate race conditions.
      this.ctrl.on('resize', ({ cols, rows }) => {
        if (this.socket.readyState !== 1) {
          return;
        }

        fetch([
          'api/terms/', this.remotePid,
          '/size?cols=', cols, '&rows=', rows,
        ].join(''), {
          method: 'POST',
        })
        .catch(err => console.error(err));
      });
    }
    catch (err) {
      this.close();
      throw err;
    }
  }

  createWindow() {
    let wnd = div.windowManager.create({
      title: 'Terminal Emulator',
    });

    wnd.classList.add('termApp');

    wnd.div.wm.stdHeader.getEl().classList.add(
      'termApp_wndHeader',
    );

    wnd.appendChild(jr.createElement(`
      <div class="termApp_wndContent window-content">
        <div class="termApp_outerContainer">
          <div class="termApp_innerContainer">
          </div>
        </div>
      </div>
    `));

    wnd.addEventListener('resize', () => this.fit());

    wnd.addEventListener('div:wm:wndClose', ev => {
      ev.preventDefault();
      this.close();
    });

    return wnd;
  }

  async connect() {
    let { ctrl } = this;
    let { cols, rows } = ctrl;

    let res = await fetch(
      `api/terms?cols=${cols}&rows=${rows}`, {
        method: 'POST',
      },
    );

    if (!res.ok) {
      throw new Error([
        `POST /api/terms:`,
        res.status,
        res.statusText,
      ].join(' '));
    }

    let pid = this.remotePid = Number(await res.text());

    let wsProtocol = location.protocol === 'https:'
      ? 'wss:' : 'ws:';

    let socket = this.socket = new WebSocket([
      wsProtocol,
      `//${location.host}`,

      location.pathname !== '/'
        ? location.pathname
        : '',

      `/api/terms/${pid}`,
    ].join(''));

    let listeners = {};

    try {
      await new Promise((resolve, reject) => {
        listeners.open = () => {
          this.ctrl.attach(socket);
          resolve();
        };

        listeners.error = reject;

        for (
          let [evName, listener]
          of Object.entries(listeners)
        ) {
          socket.addEventListener(evName, listener);
        }
      });
    }
    finally {
      for (
        let [evName, listener]
        of Object.entries(listeners)
      ) {
        socket.removeEventListener(evName, listener);
      }
    }

    socket.addEventListener('close', () => {
      this.socket = null;
      this.close();
    });
  }

  close() {
    if (this.isClosed) {
      return;
    }

    this.socket && this.socket.close();
    this.wnd && this.wnd.remove();

    this.isClosed = true;
  }

  fit() {
    let container =
      this.wnd.jr.findFirst('.termApp_outerContainer');

    let containerRect =
      container.getBoundingClientRect();

    let { ctrl } = this;
    let ctrlViewport = ctrl._core.viewport;
    let ctrlRenderer = ctrl._core.renderer;

    let ctrlStyle = getComputedStyle(ctrl.element);

    let termPadding = (() => {
      let ret = {};

      for (let side of [
        'left', 'right',
        'top', 'bottom',
      ]) {
        ret[side] = parseInt(ctrlStyle.getPropertyValue(
          `padding-${side}`), 10,
        );
      }

      return ret;
    })();

    let termPaddingH = termPadding.left + termPadding.right;
    let termPaddingV = termPadding.top + termPadding.bottom;

    let availableWidth = containerRect.width
      - termPaddingH
      - ctrlViewport.scrollBarWidth;

    let availableHeight = containerRect.height
      - termPaddingV;

    let cols = Math.floor(
      availableWidth
      / ctrlRenderer.dimensions.actualCellWidth,
    );

    let rows = Math.floor(
      availableHeight
      / ctrlRenderer.dimensions.actualCellHeight,
    );

    if (ctrl.cols !== cols || ctrl.rows !== rows) {
      ctrlRenderer.clear();
      ctrl.resize(cols, rows);
    }
  }
}
