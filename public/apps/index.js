div.apps = exports;

exports.appCtrls = {};

exports.findAppCtrlByPath = path => {
  return Object.values(exports.appCtrls).find(
    app => app.path === path,
  );
};

exports.fetchPkgMeta = async appPath => {
  let res = await fetch(`${appPath}/package.json`);

  if (!res.ok) {
    throw new Error(
      `Fetch error: ${res.status} ${res.statusText}`,
    );
  }

  return await res.json();
};

exports.load = async appPath => {
  let appCtrl = exports.findAppCtrlByPath(appPath);

  if (appCtrl) {
    return appCtrl;
  }

  let pkgMeta = await exports.fetchPkgMeta(appPath);

  let { divApp } = pkgMeta;

  if (!divApp) {
    throw new Error(
      `${appPath} is not a divOS application`,
    );
  }

  appCtrl = {
    id: `${pkgMeta.name}@${pkgMeta.version}`,
    path: appPath,
    pkgMeta,
  };

  let script = document.createElement('script');
  script.src = `${appPath}/${divApp.main}`;

  script.div = { appCtrl };
  appCtrl.script = script;

  let scriptAttachedPromise = new Promise(
    (resolve, reject) => {
      appCtrl.scriptAttached = { resolve, reject };
    },
  );

  document.head.append(script);

  // Awaits async script loading.
  await new Promise((resolve, reject) => {
    script.addEventListener(
      'error', ev => reject(ev.error),
    );

    script.addEventListener('load', resolve);
  });

  try {
    // Awaits at most 250ms for script attachment callback.
    await Promise.race([
      scriptAttachedPromise,
      new Promise(r => setTimeout(r), 250),
    ]);
  }
  catch (err) {
    console.error(err);
    script.remove();

    throw new Error(`${appPath} failed to load`);
  }

  exports.appCtrls[appCtrl.id] = appCtrl;

  return appCtrl;
};

exports.launch = async (appPath, ...appArgs) => {
  let appCtrl = await exports.load(appPath);
  return await appCtrl.launch(...appArgs);
};
