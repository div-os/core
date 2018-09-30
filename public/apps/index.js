let Vinyl = require('vinyl');
let t2 = require('through2');

div.apps = exports;

exports.loaded = [];

exports.loaded.findByPath = appPath => exports.loaded.find(
  app => app.path === appPath,
);

exports.enumerate = async () => {
  return [];
};

exports.installArchive = async archive => {
  let stream = t2.obj();
  let destPath = `/apps/${archive.stem}`;

  await div.fs.browser.rimraf(destPath);

  let pipeline = stream
    .pipe(div.fs.gulpUnzip())
    .pipe(div.fs.gulpDebug({
      logger: console.log.bind(console),
    }))
    .pipe(div.fs.browser.dest(destPath));

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

exports.loadPkgMeta = async appPath => {
  let res = await fetch(`${appPath}/package.json`);

  if (!res.ok) {
    throw new Error(
      `Fetch error: ${res.status} ${res.statusText}`,
    );
  }

  return await res.json();
};

exports.load = async appPath => {
  let appCtrl = exports.loaded.findByPath(appPath);

  if (appCtrl) {
    return appCtrl;
  }

  let meta = await exports.loadPkgMeta(appPath);
  let { divApp } = meta;

  if (!divApp) {
    throw new Error(
      `${appPath} is not a divOS application`,
    );
  }

  appCtrl = { path: appPath, meta };

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

  exports.loaded.push(appCtrl);

  return appCtrl;
};

exports.launch = async (appPath, ...appArgs) => {
  let appCtrl = await exports.load(appPath);
  return await appCtrl.launch(...appArgs);
};
