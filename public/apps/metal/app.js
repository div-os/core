(() => {
  let appCtrl = { launch };

  document.currentScript.div.load.resolve(appCtrl);

  async function launch(...args) {
    let app = new HelloWorldApp();
    await app.launch(...args);

    return app;
  }
  
  class HelloWorldApp {
  
    constructor() {
      this.tabs = [];
      
      this.tabs.push("HUE!");
      this.tabs.push("HUE2!");
      this.tabs.push("HUE3!");
    }

    async launch(...args) {
      console.log("Metal! v0.0.1");
      
      await div.scriptManager.loadStylesheet(
        `${appCtrl.appPath}/styles.css`,
      );

      
      this.wnd = jr(this.createWindow());
      this.wnd.jr.scope.metalApp = this;
    }
    
    // Checks
    canGoBack(ctx) {
      return true;
    }
    
    canGoForward(ctx) {
      return true;
    }
    
    // Actions
    async goHome(ctx) {
      return true;
    }
    
    async refresh(ctx) {
      return true;
    }
    
    async newTab(ctx) {
      return true;
    }
    
    async addToFavorites(ctx) {
      return true;
    }
    
    async openConfig(ctx) {
      return true;
    }
    
    // Create window function
    createWindow() {
      let wnd = div.windowManager.create({
        title: 'Metal',
      });

      wnd.classList.add('metalApp');
      
      let contentBoxEl =
        wnd.div.wm.stdHeader.getContentBoxEl();
        
      contentBoxEl.innerHTML = `
      <div class="metalApp_headerActions">
        <div class="btn-group">
          <button
          class="btn btn-default"
          jr-disabled.toggle="!metalApp.canGoBack()"
          jr-on-click="metalApp.goBack()"
          >
          <i class="icon icon-left"></i>
          </button>

          <button
          class="btn btn-default"
          jr-disabled.toggle="!metalApp.canGoForward()"
          jr-on-click="metalApp.goForward()"
          >
          <i class="icon icon-right"></i>
          </button>
          </button>

          <button
          class="btn btn-default"
          jr-on-click="metalApp.refresh()"
          >
          <i class="icon icon-cw"></i>
          </button>

          <button
          class="btn btn-default"
          jr-on-click="metalApp.goHome()"
          >
          <i class="icon icon-home"></i>
          </button>

          <button
          class="btn btn-default"
          jr-on-click="metalApp.newTab()"
          >
          <i class="icon icon-plus"></i>
          </button>
        </div>

        <div class="btn-group">
          Url Path Here
        </div>
      
        <div class="btn-group">
          <button
          class="btn btn-default pull-right"
          jr-on-click="metalApp.addToFavorites()"
          >
          <i class="icon icon-star"></i>
          </button>

          <button
          class="btn btn-default pull-right"
          jr-on-click="metalApp.openConfig()"
          >
          <i class="icon icon-cog"></i>
          </button>
          
        </div>
      </div>
      `

      wnd.appendChild(jr.createElement(`
        
        <div class="window-content">
          <div class="pane metalApp_contentpane">
            <div class="tab-group"
            jr-list="for tab of metalApp.tabs">
              <div class="tab-item">
                <a jr-text-content.bind="tab"></a>
              </div>
            </div>
            <div class="metalApp_contentarea">
              <iframe class="metalApp_contentframe"
              src="http://localhost:3200">
              </iframe>
            </div>
          </div>
        </div>
      `));
      
      return wnd;
    }
    
  }
})();