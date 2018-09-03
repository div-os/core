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
      this.history = [];
    }

    async launch(...args) {
      await div.scriptManager.loadStylesheet(
        `${appCtrl.appPath}/icons.css`,
      );

      await div.scriptManager.loadStylesheet(
        `${appCtrl.appPath}/styles.css`,
      );

      this.wnd = jr(this.createWindow());
      this.wnd.jr.scope.filesApp = this;

      this.browsePath('/')
        .catch(err => console.error(err));
    }

    async browsePath(path) {
      let prevDir = this.dir;

      if (prevDir && prevDir.path === path) {
        return;
      }

      this.dir = {
        i: !prevDir ? 0 : prevDir.i + 1,

        path,
        entries: [],
      };

      this.history.splice(
        this.dir.i,
        this.history.length,
        this.dir,
      );

      await new Promise(resolve => {
        this.dir.pipeline = div.fs.src('*', {
          cwd: path,
          stat: true,
        })
        .on('data', f => {
          this.dir.entries.push(f);
          jr.update();
        })
        .on('end', resolve);
      });

      jr.update();
    }

    browseHistory(i) {
      if (!this.dir) {
        return;
      }

      let nextDir = this.history[this.dir.i + i];

      if (nextDir) {
        this.dir = nextDir;
      }
    }

    goBack() {
      this.browseHistory(-1);
    }

    goForward() {
      this.browseHistory(1);
    }

    getType(f) {
      if (f.stat.isDirectory()) {
        return 'dir';
      }

      let parts = f.basename.split('.');

      return parts.length > 1
        ? parts[parts.length - 1]
        : 'unknown';
    }

    async open(f) {
      if (f.stat.isDirectory()) {
        await this.browsePath(f.path);
        return;
      }

      if ([
        '.gif',
        '.html',
        '.jpg',
        '.md',
        '.mp3',
        '.mp4',
        '.ogg',
        '.ogv',
        '.pdf',
        '.png',
        '.svg',
        '.webm',
        '.webp',
      ].some(x => f.basename.endsWith(x))) {
        div.windowManager.create({
          title: f.basename,
          iframeSrc: f.path.slice(1),
        });
      }
    }

    getPathNodeData() {
      let parts = this.dir.path.split('/');

      let ret = parts.map((x, i) => {
        if (!x) {
          return null;
        }

        let path = parts.slice(0, i + 1).join('/');

        if (x === 'home' && i === 2) {
          return { path, iconClass: 'icon icon-home' };
        }

        return { path, label: x };
      });

      ret = ret.filter(x => !!x);

      ret.unshift({
        path: '/',
        iconClass: 'icon icon-flow-cascade',
      });

      ret[ret.length - 1].active = true;

      return ret;
    }

    createWindow() {
      let wnd = div.windowManager.create({
        title: 'Files',
      });

      wnd.classList.add('filesApp');

      let contentBoxEl =
        wnd.div.wm.stdHeader.getContentBoxEl();

      contentBoxEl.innerHTML = `
        <div class="filesApp_headerActions">
          <div class="btn-group">
            <button
              class="btn btn-default"
              jr-on-click="filesApp.goBack()"
            >
              <i class="icon icon-left"></i>
            </button>

            <button
              class="btn btn-default"
              jr-on-click="filesApp.goForward()"
            >
              <i class="icon icon-right"></i>
            </button>
          </div>

          <div class="btn-group">
            <button class="btn btn-default">
              <i class="icon icon-home"></i>
            </button>

            <button class="btn btn-default">
              <i class="icon icon-cw"></i>
            </button>
          </div>

          <div class="btn-group">
            <button class="btn btn-default">
              <i class="icon icon-layout"></i>
            </button>

            <button class="btn btn-default">
              <i class="icon icon-list"></i>
            </button>
          </div>

          <div
            class="btn-group"

            jr-list="
              for n of filesApp.getPathNodeData()
            "
          >
            <button
              jr-class="btn btn-default"
              jr-on-click="filesApp.browsePath(n.path)"
            >
              <i jr-class.bind="n.iconClass"></i>
              <span jr-textcontent.bind="n.label"></span>
            </button>
          </div>
        </div>
      `;

      wnd.appendChild(jr.createElement(`
        <div class="window-content">
          <div class="pane-group">
            <div class="pane-sm sidebar">
              <div class="nav-group">
                <div class="nav-group-title">
                  Personal
                </div>

                <div class="nav-group-item active">
                  <i class="icon icon-home"></i>
                  Home
                </div>
              </div>

              <div class="nav-group">
                <div class="nav-group-title">
                  Devices
                </div>

                <div class="nav-group-item">
                  <i class="icon icon-drive"></i>
                  File system
                </div>
              </div>
            </div>

            <div class="pane">
              <div
                jr-if="filesApp.dir"

                jr-list="
                  for dirEntry of filesApp.dir.entries
                "

                class="
                  filesApp_dirBrowser
                  filesApp_dirBrowser--grid
                "
              >
                <button
                  class="
                    filesApp_dirEntry
                    filesApp_dirEntry--grid
                  "

                  jr-on-dblclick="filesApp.open(dirEntry)"
                >
                  <div jr-class="
                    filesApp_dirEntry-icon

                    filesApp_dirEntry-icon--{{
                      filesApp.getType(dirEntry)
                    }}
                  "></div>

                  <span
                    class="filesApp_dirEntry-name"
                    jr-textcontent.bind="dirEntry.basename"
                  ></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `));

      return wnd;
    }
  }
})();
