(() => {
  let appCtrl = { launch };

  document.currentScript.div.load.resolve(appCtrl);

  async function launch(...args) {
    let app = new FilesApp();
    await app.launch(...args);

    return app;
  }

  class FilesApp {
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

      let contentEl = jr(document.createElement('div'));
      wnd.appendChild(contentEl);

      contentEl.classList.add('window-content');

      contentEl.innerHTML = `
        <div class="pane-group">
          <div class="pane-sm sidebar padded-more">
          </div>

          <div class="pane">
            <div class="filesApp_dirBrowser"></div>
          </div>
        </div>
      `;

      let dirBrowserEl = contentEl.jr.findFirst(
        '.filesApp_dirBrowser',
      );

      for (let f of ['example.txt', 'monika.jpg']) {
        let entryEl = jr(document.createElement('button'));
        dirBrowserEl.appendChild(entryEl);

        entryEl.classList.add('filesApp_dirEntry');

        entryEl.innerHTML = `
          <div class=" filesApp_dirEntry-icon"></div>
          <span class="filesApp_dirEntry-name"></span>
        `;

        let iconEl = entryEl.jr.findFirst(
          '.filesApp_dirEntry-icon',
        );

        iconEl.classList.add(
          `filesApp_dirEntry-icon--${f.split('.')[1]}`,
        );

        let nameEl = entryEl.jr.findFirst(
          '.filesApp_dirEntry-name',
        );

        nameEl.textContent = f;
      }
    }
  }
})();
