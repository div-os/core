(() => {
  let appCtrl = { launch };

  document.currentScript.div.load.resolve(appCtrl);

  async function launch(...args) {
    let app = new TermApp();
    await app.launch(...args);

    return app;
  }

  class TermApp {
    constructor() {
    }

    async launch(...args) {
      let xtermPath = 'node_modules/xterm/dist';

      await Promise.all([
        div.scriptManager.loadStylesheet(
          `${xtermPath}/xterm.css`,
        ),

        div.scriptManager.loadStylesheet(
          `${appCtrl.appPath}/styles.css`,
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
      this.wnd.jr.scope.termApp = this;

      this.openNewTab().catch(err => console.error(err));
    }

    async openNewTab(path) {
      this.ctrl = new Terminal();

      this.ctrl.open(
        this.wnd.jr.findFirst('.termApp_innerContainer'),
      );

      this.fit();

      await new Promise(
        resolve => requestAnimationFrame(resolve),
      );

      await this.connect();
    }

    isActiveTab(tab) {
      return this.activeTab === tab;
    }

    switchToTab(tab) {
      this.activeTab = tab;
    }

    closeTab(tab) {
      let isActiveTab = this.isActiveTab(tab);
      let i = this.tabs.indexOf(tab);

      if (i === -1) {
        throw new Error(`No such tab`);
      }

      this.tabs.splice(i, 1);

      if (isActiveTab) {
        this.activeTab =
          this.tabs[i] || this.tabs[i - 1] || null;
      }
    }

    createWindow() {
      let wnd = div.windowManager.create({
        title: 'Terminal Emulator',
      });

      wnd.classList.add('termApp');

      wnd.appendChild(jr.createElement(`
        <div class="window-content">
          <div class="termApp_outerContainer">
            <div class="termApp_innerContainer">
            </div>
          </div>
        </div>
      `));

      wnd.addEventListener('resize', () => this.fit());

      return wnd;
    }

    async connect() {
      let { ctrl } = this;
      let { cols, rows } = ctrl;

      let res = await fetch(
        `/api/terms?cols=${cols}&rows=${rows}`, {
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

      let pid = Number(await res.text());

      let wsProtocol = location.protocol === 'https:'
        ? 'wss:' : 'ws:';

      let socket = this.socket = new WebSocket([
        wsProtocol,
        `//${location.host}`,
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
})();
