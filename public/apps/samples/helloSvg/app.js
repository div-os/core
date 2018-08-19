let appCtrl = { launch };

document.currentScript.div.load.resolve(appCtrl);

function launch(...args) {
  div.windowManager.create({
    args,
    title: 'Hello SVG',
    iframeSrc: `${appCtrl.appPath}/index.html`,
  });
}
