let promises = require('./helper/promises');

div.launcher = exports;
let pvt = {};

pvt.isOpen = false;

Object.defineProperty(exports, 'isOpen', {
  get: () => pvt.isOpen,

  set: val => {
    pvt.isOpen = val;

    (async () => {
      if (!val) {
        return;
      }

      await promises.nextFrame();
      exports.findSearchFormInputEl().focus();

      await promises.clickOutside(exports.findEl());
      exports.close();
    })()
    .catch(err => console.error(err));
  },
});

exports.findEl = () => jr.findFirst('.launcher');

exports.findSearchFormInputEl =
  () => jr.findFirst('.launcher-searchFormInput');

exports.open = () => {
  exports.isOpen = true;
  jr.update();
};

exports.close = () => {
  exports.isOpen = false;
  jr.update();
};

exports.toggle = () => {
  exports.isOpen = !exports.isOpen;
  jr.update();
};
