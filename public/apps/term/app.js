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
      await Promise.all([
        div.scriptManager.loadStylesheet(
          `node_modules/xterm/dist/xterm.css`,
        ),

        div.scriptManager.loadStylesheet(
          `${appCtrl.appPath}/styles.css`,
        ),

        div.scriptManager.load(
          `node_modules/xterm/dist/xterm.js`,
        ),
      ]);

      this.wnd = jr(this.createWindow());
      this.wnd.jr.scope.termApp = this;

      this.openNewTab().catch(err => console.error(err));
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

    async openNewTab(path) {
      this.ctrl = new Terminal();

      this.ctrl.open(
        this.wnd.jr.findFirst('.termApp_innerContainer'),
      );

      this.ctrl.write(
        'Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ',
      );

      this.fit();
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
  }
})();
