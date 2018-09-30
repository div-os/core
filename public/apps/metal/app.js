(() => {
  let { appCtrl } = document.currentScript.div;

  appCtrl.launch = async function (...args) {
    let app = new MetalApp();
    await app.launch(...args);

    return app;
  };

  appCtrl.scriptAttached.resolve();

  class MetalApp {
    async launch(url) {
      await div.scriptManager.loadStylesheet(
        `${appCtrl.path}/styles.css`,
      );

      let wnd = this.wnd = jr(div.windowManager.create({
        title: 'Metal Web Browser',
        iframeSrc: url || 'https://suckless.org',
      }));

      let urlInputEl = this.urlInputEl = jr.createElement(`
        <input
          class="metalApp_urlInput title"
          placeholder="Metal Web Browser"
          spellcheck="false"
        >
      `);

      urlInputEl.addEventListener('keyup', ev => {
        if (ev.key !== 'Enter') {
          return;
        }

        this.navigate(ev.target.value);
        ev.target.blur();
      });

      {
        let titleEl = wnd.jr.findFirst('.title');

        titleEl.parentElement.replaceChild(
          urlInputEl, titleEl,
        );
      }

      this.iframeEl = wnd.jr.findFirst('iframe');

      wnd.jr.scope.metalApp = this;

      window.addEventListener('message', ev => {
        let { data } = ev;

        if (data.docLocation) {
          this.urlInputEl.value = data.docLocation;
        }
      });
    }

    navigate(url) {
      this.iframeEl.src = url;
    }
  }
})();
