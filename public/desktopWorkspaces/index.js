div.desktopWorkspaces = module.exports = exports = {
  all: [
    { id: 'web', icon: 'world', highlight: true },
    { id: 'term', icon: 'term', highlight: true },
    { id: 'game', icon: 'game' },
  ],

  activeId: 'web',

  isActive(w) {
    return this.activeId === w.id;
  },

  switchTo(w) {
    this.activeId = w.id;
    this.update();
  },

  update() {
    let { activeId } = this;

    for (let wnd of jr.find('[div-workspace]')) {
      wnd.classList.toggle(
        'workspaceItem--hidden',
        wnd.getAttribute('div-workspace') !== activeId,
      );
    }
  },
};
