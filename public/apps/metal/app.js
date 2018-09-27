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
    }

    async launch(...args) {
      console.log("Hello World!");
    }
  }
})();