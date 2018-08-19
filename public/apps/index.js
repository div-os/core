let Vinyl = require('vinyl');
let t2 = require('through2');

div.apps = exports;

exports.install = pkg => {
};

exports.installArchive = async archive => {
  let stream = t2.obj();

  let pipeline = stream
    .pipe(div.fs.gulpUnzip())
    .pipe(div.fs.gulpDebug({
      logger: console.log.bind(console),
    }))
    .pipe(div.fs.browser.dest(`/apps/${archive.stem}`));

  stream.push(archive);
  stream.end();

  await new Promise((resolve, reject) => {
    pipeline.on('error', reject);
    pipeline.on('end', resolve);
  });
};

exports.fetchAndInstall = async path => {
  let res = await fetch(path);

  if (!res.ok) {
    throw new Error(
      `Fetch error: ${res.status} ${res.statusText}`,
    );
  }

  let buf = Buffer.from(await (async () => {
    let reader = new FileReader();

    let readPromise = new Promise((resolve, reject) => {
      reader.onerror = reject;
      reader.onload = ev => resolve(ev.target.result);
    });

    reader.readAsArrayBuffer(await res.blob());

    return await readPromise;
  })());

  return await exports.installArchive(new Vinyl({
    path,
    contents: buf,

    pipe: target => {
      let stream = t2.obj();
      stream.push(buf);

      return stream.pipe(target);
    },
  }));
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

  appCtrl.appPath = appPath;

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
