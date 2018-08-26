(() => {
  let appCtrl = { launch };

  document.currentScript.div.load.resolve(appCtrl);

  async function launch(...args) {
    let app = new FilesApp();
    await app.launch(...args);

    return app;
  }

  class FilesApp {
    constructor() {
      this.dir = {
        entries: [
          { name: 'hello.txt' },
          { name: 'world.jpg' },
        ],
      };
    }

    async launch(...args) {
      await div.scriptManager.loadStylesheet(
        `${appCtrl.appPath}/icons.css`,
      );

      await div.scriptManager.loadStylesheet(
        `${appCtrl.appPath}/styles.css`,
      );

      let wnd = this.wnd = jr(div.windowManager.create({
        args,
        title: 'Files',
      }));

      wnd.jr.scope.filesApp = this;

      wnd.appendChild(jr.createElement(`
        <div class="window-content">
          <div class="pane-group">
            <div class="pane-sm sidebar padded-more">
            </div>

            <div class="pane">
              <div
                class="filesApp_dirBrowser"
                jr-list="for dirEntry of filesApp.dir.entries"
              >
                <button class="filesApp_dirEntry">
                  <div jr-class="
                    filesApp_dirEntry-icon

                    filesApp_dirEntry-icon--{{
                      dirEntry.name.split('.')[1]
                    }}
                  "></div>

                  <span
                    class="filesApp_dirEntry-name"
                    jr-textcontent.bind="dirEntry.name"
                  ></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `));
    }
  }
})();
