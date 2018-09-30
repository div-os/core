(() => {
  let { appCtrl } = document.currentScript.div;

  appCtrl.launch = (...args) => {
    div.windowManager.create({
      args,
      title: 'Hello SVG',
      iframeSrc: `${appCtrl.path}/index.html`,
    });
  };

  appCtrl.scriptAttached.resolve();
})();
