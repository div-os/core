exports.clickOutside = async el => {
  let ev;

  do {
    ev = await exports.event(document, 'click');
  } while (el.contains(ev.target));

  return ev;
};

exports.event = (targetEl, evName, opt = {}) => {
  let resolve;
  let promise = new Promise(r => resolve = r);

  let delegateEl = opt.delegateEl || targetEl;

  let handler = ev => {
    if (targetEl && !targetEl.contains(ev.target)) {
      return;
    }

    resolve(ev);
    delegateEl.removeEventListener(evName, handler);
  };

  delegateEl.addEventListener(evName, handler);

  return promise;
};

exports.nextFrame = () => new Promise(resolve => {
  requestAnimationFrame(resolve);
});
