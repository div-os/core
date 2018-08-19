div.scriptManager = exports;

exports.tryGetBySrc = src => {
  return jr.findFirst(`script[src="${src}"]`);
};

exports.tryGetLinkByHref = href => {
  return jr.findFirst(`link[href="${href}"]`);
};

exports.load = async src => {
  let script = exports.tryGetBySrc(src);

  if (script) {
    return script;
  }

  script = document.createElement('script');
  script.src = src;

  let loadPromise = new Promise((resolve, reject) => {
    script.addEventListener('error', ev => reject(ev.error));
    script.addEventListener('load', resolve);
  });

  document.head.appendChild(script);
  await loadPromise;

  return script;
};

exports.loadStylesheet = async href => {
  let link = exports.tryGetLinkByHref(href);

  if (link) {
    return link;
  }

  link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;

  let loadPromise = new Promise((resolve, reject) => {
    link.addEventListener('error', ev => reject(ev.error));
    link.addEventListener('load', resolve);
  });

  document.head.appendChild(link);
  await loadPromise;

  return link;
};
