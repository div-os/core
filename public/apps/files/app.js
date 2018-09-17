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
      this.tabs = [];

      this.sidebarGroups = [
        /*
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
        */

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

      this.openNewTab().catch(err => console.error(err));
    }

    get activeDir() {
      return this.activeTab.dir;
    }

    async updateHomePath() {
      this.homePath = await div.env.get('HOME');
    }

    async openNewTab(path) {
      let tab = {
        history: [],

        get name() {
          if (!this.dir) {
            return 'New tab';
          }

          let { path } = this.dir;

          if (path === '/') {
            return path;
          }

          let pathParts = path.split('/');
          return pathParts[pathParts.length - 1];
        },
      };

      this.tabs.push(tab);
      this.activeTab = tab;

      await this.browsePath(path || '/');
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

    async browsePath(path, ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      let prevDir = tab.dir;

      if (prevDir && prevDir.path === path) {
        return;
      }

      tab.dir = {
        i: !prevDir ? 0 : prevDir.i + 1,

        path,
        entries: [],
      };

      tab.history.splice(
        tab.dir.i,
        tab.history.length,
        tab.dir,
      );

      try {
        await Promise.all([
          this.updateActiveSidebarItem(ctx),

          new Promise(resolve => {
            tab.dir.pipeline = div.fs.src('*', {
              cwd: path,
              stat: true,
            })
            .on('data', f => {
              tab.dir.entries.push(f);
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

    browseHistory(i, ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      let nextDir = this.getRelativeHistoryEntry(i, ctx);

      if (nextDir) {
        tab.dir = nextDir;
      }
    }

    canGoBack(ctx) {
      return !!this.getRelativeHistoryEntry(-1, ctx);
    }

    canGoForward(ctx) {
      return !!this.getRelativeHistoryEntry(1, ctx);
    }

    goBack(ctx) {
      this.browseHistory(-1, ctx);
    }

    goForward(ctx) {
      this.browseHistory(1, ctx);
    }

    getRelativeHistoryEntry(i, ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      if (!tab.dir) {
        return null;
      }

      return tab.history[tab.dir.i + i];
    }

    async browseSidebar(item, ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      tab.optimisticallyActiveSidebarItem = item;

      let { path } = item;

      if (typeof path === 'function') {
        path = await path();
      }

      await this.browsePath(path, ctx);

      jr.update();
    }

    async updateActiveSidebarItem(ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      let { dir } = tab;

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

    isActiveSidebarItem(item, ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      let {
        dir,
        optimisticallyActiveSidebarItem,
      } = tab;

      if (optimisticallyActiveSidebarItem) {
        return optimisticallyActiveSidebarItem === item;
      }

      return dir && dir.activeSidebarItem === item;
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

    async open(f, ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      if (f.stat.isDirectory()) {
        await this.browsePath(f.path, ctx);
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

    getPathNodeData(ctx) {
      ctx = ctx || {};

      let { tab } = {
        ...ctx || {},
        tab: ctx.tab || this.activeTab,
      };

      let parts = tab.dir.path.split('/');

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
              class="btn btn-default"
              jr-disabled.toggle="!filesApp.canGoBack()"
              jr-on-click="filesApp.goBack()"
            >
              <i class="icon icon-left"></i>
            </button>

            <button
              class="btn btn-default"
              jr-disabled.toggle="!filesApp.canGoForward()"
              jr-on-click="filesApp.goForward()"
            >
              <i class="icon icon-right"></i>
            </button>
          </div>

          <div class="btn-group">
            <button class="btn btn-default">
              <i class="icon icon-cw"></i>
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

            <div class="filesApp_dirBrowserPane pane">
              <div class="filesApp_tabs">
                <div
                  class="filesApp_tabs-tabList"
                  jr-list="for tab of filesApp.tabs"
                >
                  <div
                    jr-class="
                      filesApp_tabs-tab

                      {{filesApp.tabs.length === 1
                        ? 'filesApp_tabs-tab--only-tab' : ''}}

                      {{filesApp.isActiveTab(tab)
                        ? 'filesApp_tabs-tab--active'
                        : 'filesApp_tabs-tab--inactive'}}
                    "
                  >
                    <button
                      class="filesApp_tabs-closeTabBtn"

                      jr-disabled.toggle="
                        filesApp.tabs.length === 1
                      "

                      jr-on-click="filesApp.closeTab(tab)"
                    >
                      <i class="icon icon-cancel"></i>
                    </button>

                    <span
                      class="filesApp_tabs-tabName"
                      jr-text-content.bind="tab.name"

                      jr-on-click="
                        filesApp.switchToTab(tab)
                      "
                    ></span>
                  </div>
                </div>

                <button
                  class="filesApp_tabs-newTabBtn"
                  jr-on-click="filesApp.openNewTab()"
                >
                  <i class="icon icon-plus"></i>
                </button>
              </div>

              <div
                jr-if="filesApp.activeDir"

                jr-list="
                  for dirEntry of filesApp.activeDir.entries
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
