div.apps = exports;

exports.install = pkg => {
};

exports.makeScriptPath = appPath => `${appPath}/app.js`;

exports.tryGetScript = appPath => {
  let script = jr.findFirst(
    `script[src="${exports.makeScriptPath(appPath)}"]`,
  );

  if (!script || !script.div || !script.div.appCtrl) {
    return null;
  }

  return script;
};

exports.getScript = appPath => {
  let script = exports.tryGetScript(appPath);

  if (!script) {
    throw new Error(`${appPath} is not loaded`);
  }

  return script;
};

exports.isLoaded =
  appPath => !!exports.tryGetScript(appPath);

exports.load = async appPath => {
  let script = exports.tryGetScript(appPath);

  if (script) {
    return script.div.appCtrl;
  }

  script = document.createElement('script');
  script.src = exports.makeScriptPath(appPath);

  script.div = {};

  let appLoadPromise = new Promise((resolve, reject) => {
    script.div.load = { resolve, reject };
  });

  document.head.append(script);

  // Awaits async script loading.
  await new Promise((resolve, reject) => {
    script.addEventListener('error', ev => reject(ev.error));
    script.addEventListener('load', resolve);
  });

  // Awaits at most 250ms for app load / appCtrl callback.
  let appCtrl = await Promise.race([
    appLoadPromise,
    new Promise(r => setTimeout(r), 250),
  ])
  .catch(err => console.error(err));

  // appCtrl is falsy in case of errors or callback timeout.
  if (!appCtrl) {
    script.remove();
    throw new Error(`${appPath} failed to load`);
  }

  return script.div.appCtrl = appCtrl;
};

exports.unload = async appPath => {
  let scriptPath = `${appPath}/app.js`;
  let script = jr.findFirst(`script[src="${scriptPath}"]`);

  if (!script) {
    throw new Error(`${appPath} is not loaded`);
  }

  script.remove();
};

exports.reload = async appPath => {
  if (exports.isLoaded(appPath)) {
    await exports.unload(appPath);
  }

  return await exports.load(appPath);
};

exports.launch = async (appPath, ...appArgs) => {
  let appCtrl = await exports.load(appPath);
  return await appCtrl.launch(...appArgs);
};

exports.reloadAndLaunch = async (appPath, ...appArgs) => {
  await exports.reload(appPath);
  return await exports.launch(appPath, ...appArgs);
};
