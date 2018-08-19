document.addEventListener('DOMContentLoaded', () => {
  let wnd = frameElement.div.wm.parentWnd;
  let [who] = wnd.div.wm.args;

  let tmpl = document.querySelector('template');
  let svg = document.importNode(tmpl.content, true);

  svg.querySelector('.text--line2').textContent = who;

  document.body.appendChild(svg);
});
