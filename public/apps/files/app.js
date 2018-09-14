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

      this.sidebarGroups = [
        {
          label: 'Personal',

          items: [
            {
              iconClass: 'icon icon-home',
              label: 'Home',

              path: async () => {
                await this.updateHomePath();
                return this.homePath;
              },
            },
          ],
        },

        {
          label: 'Devices',

          items: [
            {
              iconClass: 'icon icon-flow-cascade',
              label: 'File system',
              path: '/',
            },
          ],
        },
      ];
    }

    async updateActiveSidebarItem(dir) {
      let allItems = this.sidebarGroups.reduce(
        (acc, x) => acc.concat(x.items), [],
      );

      allItems.sort((a, b) => {
        let aPathLen = a.path.length;
        let bPathLen = b.path.length;

        if (aPathLen < bPathLen) {
          return -1;
        }

        if (aPathLen > bPathLen) {
          return 1;
        }

        if (aPathLen === bPathLen) {
          return 0;
        }
      });

      let itemsWithResolvedPaths = await Promise.all(
        allItems.map(async x => {
          if (typeof x.path !== 'function') {
            return x;
          }

          return { ...x, path: await x.path() };
        }),
      );

      let activeItemIndex =
        itemsWithResolvedPaths.findIndex(
          x => dir.path.startsWith(x.path),
        );

      dir.activeSidebarItem = allItems[
        activeItemIndex
      ];

      this.optimisticallyActiveSidebarItem = null;

      jr.update();

      return dir.activeSidebarItem;
    }

    isActiveSidebarItem(item) {
      if (this.optimisticallyActiveSidebarItem) {
        return
          this.optimisticallyActiveSidebarItem === item;
      }

      return this.dir
        && this.dir.activeSidebarItem === item;
    }

    async launch(...args) {
      await div.scriptManager.loadStylesheet(
        `${appCtrl.appPath}/icons.css`,
      );

      await div.scriptManager.loadStylesheet(
        `${appCtrl.appPath}/styles.css`,
      );

      await this.updateHomePath();

      this.wnd = jr(this.createWindow());
      this.wnd.jr.scope.filesApp = this;

      this.browsePath('/')
        .catch(err => console.error(err));
    }

    async updateHomePath() {
      this.homePath = await div.env.get('HOME');
    }

    async browseSidebar(item) {
      this.optimisticallyActiveSidebarItem = item;

      let { path } = item;

      if (typeof path === 'function') {
        path = await path();
      }

      await this.browsePath(path);

      jr.update();
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

      try {
        await Promise.all([
          this.updateActiveSidebarItem(this.dir),

          new Promise(resolve => {
            this.dir.pipeline = div.fs.src('*', {
              cwd: path,
              stat: true,
            })
            .on('data', f => {
              this.dir.entries.push(f);
              jr.update();
            })
            .on('end', resolve);
          }),
        ]);
      }
      finally {
        jr.update();
      }
    }

    getRelativeHistoryEntry(i) {
      if (!this.dir) {
        return null;
      }

      return this.history[this.dir.i + i];
    }

    browseHistory(i) {
      let nextDir = this.getRelativeHistoryEntry(i);

      if (nextDir) {
        this.dir = nextDir;
      }
    }

    canGoBack() {
      return !!this.getRelativeHistoryEntry(-1);
    }

    canGoForward() {
      return !!this.getRelativeHistoryEntry(1);
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
        '.avi',
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

        if (path === this.homePath) {
          return {
            path,
            label: x,
            iconClass: 'icon icon-home',
          };
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
              class="btn btn-mini btn-default"
              jr-disabled.toggle="!filesApp.canGoBack()"
              jr-on-click="filesApp.goBack()"
            >
              <i class="icon icon-left"></i>
            </button>

            <button
              class="btn btn-mini btn-default"
              jr-disabled.toggle="!filesApp.canGoForward()"
              jr-on-click="filesApp.goForward()"
            >
              <i class="icon icon-right"></i>
            </button>
          </div>

          <div class="btn-group">
            <button class="btn btn-mini btn-default">
              <i class="icon icon-home"></i>
            </button>

            <button class="btn btn-mini btn-default">
              <i class="icon icon-cw"></i>
            </button>
          </div>

          <div class="btn-group">
            <button class="btn btn-mini btn-default">
              <i class="icon icon-layout"></i>
            </button>

            <button class="btn btn-mini btn-default">
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
              jr-class="btn btn-mini btn-default"
              jr-on-click="filesApp.browsePath(n.path)"
            >
              <i
                jr-if="n.iconClass"

                jr-class="
                  filesApp_pathNodeIcon

                  {{
                    n.label
                      ? 'filesApp_pathNodeIcon--hasLabel'
                      : ''
                  }}

                  {{n.iconClass}}
                "
              ></i>

              <span
                jr-if="n.label"
                jr-text-content.bind="n.label"
              ></span>
            </button>
          </div>
        </div>
      `;

      wnd.appendChild(jr.createElement(`
        <div class="window-content">
          <div class="pane-group">
            <div class="pane-sm sidebar">
              <div
                class="nav-group"

                jr-list="
                  for group of filesApp.sidebarGroups
                "
              >
                <div>
                  <div
                    class="nav-group-title"
                    jr-text-content.bind="group.label"
                  ></div>

                  <div jr-list="for item of group.items">
                    <a
                      jr-class="
                        nav-group-item

                        {{filesApp.isActiveSidebarItem(item)
                          ? 'active' : ''}}
                      "

                      jr-on-click="
                        filesApp.browseSidebar(item)
                      "
                    >
                      <i
                        jr-class.bind="item.iconClass"
                      ></i>

                      <span
                        jr-text-content.bind="item.label"
                      ></span>
                    </a>
                  </div>
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
                    jr-text-content.bind="dirEntry.basename"
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
