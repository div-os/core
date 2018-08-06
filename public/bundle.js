(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
window.jr = require('.');

},{".":3}],2:[function(require,module,exports){
exports.arrayShuffle = a => {
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let x = a[i];
    a[i] = a[j];
    a[j] = x;
  }

  return a;
};

let escapeRe = /([.*+?^=!:${}()|\[\]\/\\])/g;

exports.escapeRegExp =
  str => str.replace(escapeRe, '\\$1');

exports.elAttrsToString = el => {
  let tagName = el.tagName.toLowerCase();
  let attrs = [];

  for (let i = 0; i < el.attributes.length; ++i) {
    let attr = el.attributes[i];
    attrs.push(`${attr.name}="${attr.value}"`);
  }

  return `<${tagName} ${attrs.join(' ')}>`;
};

},{}],3:[function(require,module,exports){
let MutationSummary = require('mutation-summary');

let jr = module.exports = exports = target => {
  if (typeof target === 'string') {
    return jr.find(target);
  }

  if (typeof target[Symbol.iterator] === 'function') {
    let ret = Array.from(target);

    ret.jr = new JrProp(ret);

    for (let el of ret) {
      el.jr = new JrProp(el);
    }

    return ret;
  }

  target.jr = new JrProp(target);

  return target;
};

class JrProp {
  constructor(ctx) {
    if (!Array.isArray(ctx) && ctx.jr) {
      Object.assign(this, ctx.jr);
    }

    this.ctx = ctx;
  }

  find(selector) {
    if (Array.isArray(this.ctx)) {
      let matches = new Set();

      for (let thisEl of this.ctx) {
        for (let thatEl of jr.find(selector, thisEl)) {
          matches.add(thatEl);
        }
      }

      return Array.from(matches);
    }
    else {
      return jr.find(selector, this.ctx);
    }
  }

  findFirst(selector) {
    if (Array.isArray(this.ctx)) {
      for (let thisEl of this.ctx) {
        let thatEl = jr.findFirst(selector, thisEl);

        if (thatEl) {
          return thatEl;
        }
      }

      return null;
    }
    else {
      return jr.findFirst(selector, this.ctx);
    }
  }

  get parentElements() {
    if (Array.isArray(this.ctx)) {
      throw new Error(
        `jr.parentElements only works with single elements`,
      );
    }

    let ret = [];
    let cursorEl = this.ctx;

    while (cursorEl.parentElement) {
      ret.push(cursorEl.parentElement);
      cursorEl = cursorEl.parentElement;
    }

    return ret;
  }

  getScope() {
    if (Array.isArray(this.ctx)) {
      throw new Error(
        `jr.getScope() only works with single elements`,
      );
    }

    return jr.getScope(this.ctx);
  }

  setScope(scope) {
    if (Array.isArray(this.ctx)) {
      throw new Error(
        `Cannot set scope for multiple elements at once`,
      );
    }

    return this.scope = scope;
  }
}

jr.find = (selector, el) => {
  let ret = Array.from(
    (el || document).querySelectorAll(selector),
  );

  ret.jr = new JrProp(ret);

  for (let foundEl of ret) {
    foundEl.jr = new JrProp(foundEl);
  }

  return ret;
};

jr.findFirst = (selector, el) => {
  let ret = (el || document).querySelector(selector);

  if (ret) {
    ret.jr = new JrProp(ret);
  }

  return ret;
};

Object.assign(jr, require('./helpers'));

jr.index = new Map();

jr.init = () => {
  jr.index = new Map();

  for (let el of jr.find('*')) {
    if (!document.contains(el)) {
      continue;
    }

    jr.initEl(el);
  }

  jr.observer = new MutationSummary({
    queries: [{ all: true }],

    callback: summaries => {
      let summary = summaries[0];

      for (let el of summary.added) {
        if (el.nodeName === '#text') {
          continue;
        }

        jr.initEl(el);
      }

      removedElsLoop:
      for (let el of summary.removed) {
        el = jr(el);

        for (let el2 of [el, ...el.jr.parentElements]) {
          if (el2.jr.commentAnchor) {
            continue removedElsLoop;
          }
        }

        let { originalNode } = el.jr;

        if (
          originalNode
          && !document.contains(originalNode)
        ) {
          jr.index.delete(originalNode);
          continue removedElsLoop;
        }

        jr.index.delete(el);
      }

      let dirtyEls = new Set();

      for (let [attrName, els] of Object.entries(
        summary.attributeChanged,
      )) {
        for (let el of els) {
          if (
            !attrName.startsWith('jr-')
            || summary.added.includes(el)
            || summary.removed.includes(el)
          ) {
            continue;
          }

          let indexEntry = jr.index.get(el);
          let attrVal = el.getAttribute(attrName);

          if (indexEntry.attrs[attrName].value === attrVal) {
            continue;
          }

          dirtyEls.add(el);
        }
      }

      for (let el of dirtyEls) {
        jr.updateEl(el);
      }
    },
  });

  document.addEventListener('click', () => jr.update());
};

jr.initEl = el => {
  if (jr.index.has(el) || el.nodeName === '#comment') {
    return;
  }

  let indexEntry;

  for (let i = 0; i < el.attributes.length; ++i) {
    let attr = el.attributes.item(i);

    if (!attr.name.startsWith('jr-')) {
      continue;
    }

    indexEntry = indexEntry || {
      el, attrs: {},
    };

    indexEntry.attrs[attr.name] = {
      name: attr.name,
      value: attr.value,
    };
  }

  if (!indexEntry) {
    return;
  }

  jr.index.set(el, indexEntry);
  jr.updateEl(el);

  if (el.tagName === 'INPUT') {
    el.addEventListener('keydown', jr.onChange);
    el.addEventListener('keyup', jr.onChange);
  }

  el.addEventListener('change', jr.onChange);
};

jr.getScope = el => {
  let scope = { refs: {}, els: [] };

  {
    let cursorEl = el;

    while (cursorEl) {
      if (cursorEl.jr && cursorEl.jr.listItem) {
        let { listItem } = cursorEl.jr;

        scope.refs[listItem.iteratorName] = {
          type: 'iterator',
          key: listItem.iteratorName,
          value: listItem.value,
        };
      }

      if (cursorEl.jr && cursorEl.jr.scope) {
        let cursorScope = cursorEl.jr.scope;

        scope.els.push(cursorEl);

        for (let [k, v] of Object.entries(cursorScope)) {
          if (scope.refs[k]) {
            continue;
          }

          scope.refs[k] = {
            type: 'scope',
            el: cursorEl,
            obj: cursorScope,
            key: k,
            value: v,
          };
        }
      }

      cursorEl = !cursorEl.jr || !cursorEl.jr.commentAnchor
        ? cursorEl.parentElement
        : cursorEl.jr.commentAnchor.parentElement;
    }
  }

  scope.hash = {};

  for (let [k, ref] of Object.entries(scope.refs)) {
    let { value } = ref;

    if (typeof ref.value === 'function') {
      value = value.bind(ref.obj);
    }

    scope.hash[k] = value;
  }

  scope.get = k => {
    let ref = scope.refs[k];
    return ref && ref.value;
  };

  let jsIdRe = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  scope.getLocals = () => Object.keys(scope.hash)
    .filter(x => jsIdRe.test(x));

  scope.eval = expr => {
    try {
      let localsCode = scope.getLocals().join(', ');

      return new Function('$jrScopeHash', `
        const { ${localsCode} } = $jrScopeHash;
        return (${expr});
      `)(scope.hash);
    }
    catch (err) {
      if (err instanceof ReferenceError) {
        return null;
      }

      err.message = `${err.message} in ${expr}`;
      throw err;
    }
  };

  scope.set = (expr, v) => {
    try {
      let dotOperands = expr.split('.');

      let firstKey = dotOperands[0];
      let firstKeyRef = scope.refs[firstKey];

      if (!firstKeyRef) {
        throw new ReferenceError(
          `${firstKey} is undefined`,
        );
      }

      let restOfExpr = dotOperands.slice(1).join('.');

      if (restOfExpr) {
        restOfExpr = `.${restOfExpr}`;
      }

      let ctx;
      let genExpr = '$jrScopeCtx';

      switch (firstKeyRef.type) {
        case 'scope':
          ctx = firstKeyRef.obj;
          genExpr += `.${firstKey}${restOfExpr}`;

          break;

        case 'iterator':
          if (!restOfExpr) {
            throw new TypeError(
              `Assignment to constant variable (an ` +
              `iterator)`,
            );
          }

          ctx = firstKeyRef.value;
          genExpr += restOfExpr;

          break;

        default:
          throw new Error('???');
      }

      genExpr += ` = $jrScopeSetVal`;

      let localsCode = scope.getLocals().join(', ');

      return new Function(
        '$jrScopeHash', '$jrScopeCtx', '$jrScopeSetVal', `
          const { ${localsCode} } = $jrScopeHash;
          return (${genExpr});
        `,
      )(scope.hash, ctx, v);
    }
    catch (err) {
      let ErrorType = err.constructor;
      throw new ErrorType(`${err.message} in ${expr}`);
    }
  };

  return scope;
};

jr.onChange = ev => {
  let el = ev.target;

  try {
    let indexEntry = jr.index.get(el);

    if (!indexEntry) {
      return;
    }

    let attr = indexEntry.attrs['jr-value.bind'];

    if (!attr) {
      return;
    }

    let scope = jr.getScope(el);

    scope.set(attr.value, el.value);
  }
  catch (err) {
    err.message =
      `${err.message} while handling change` +
      ` event for ${jr.elAttrsToString(el)}`;

    throw err;
  }

  jr.update();
};

jr.updateIfEl = el => {
  el = jr(el);

  let scope = el.jr.getScope(el);

  let indexEntry = jr.index.get(el);
  let ifAttr = indexEntry.attrs['jr-if'];

  let condExpr = ifAttr.value = el.getAttribute('jr-if');

  let { evaluatedBefore } = ifAttr;
  let oldResult = ifAttr.computed;
  let result = !!scope.eval(condExpr);

  if (evaluatedBefore && result === oldResult) {
    return;
  }

  ifAttr.evaluatedBefore = true;
  ifAttr.computed = result;

  if (!evaluatedBefore && result) {
    return;
  }

  if (result) {
    indexEntry.commentAnchor.parentElement.replaceChild(
      el, indexEntry.commentAnchor,
    );

    el.jr.commentAnchor = null;
    indexEntry.commentAnchor = null;
  }
  else {
    let anchor = document.createComment(
      ` jr anchor for ${el.tagName.toLowerCase()} `,
    );

    anchor.jr = {
      originalNode: el,
    };

    el.parentElement.replaceChild(anchor, el);

    el.jr.commentAnchor = anchor;
    indexEntry.commentAnchor = anchor;
  }
};

jr.updateListEl = el => {
  let scope = jr.getScope(el);

  let indexEntry = jr.index.get(el);
  let listAttr = indexEntry.attrs['jr-list'];

  let listExpr =
    listAttr.value = el.getAttribute('jr-list');

  let parsedListExpr =
    /^for ([^ ]+) of (.+)$/.exec(listExpr);

  if (!parsedListExpr) {
    console.error(`[jr] Invalid jr-list expression in`, el);
    return;
  }

  let iteratorName = parsedListExpr[1];
  let iterableExpr = parsedListExpr[2];

  let oldList = listAttr.computed;

  let list = listAttr.computed =
    Array.from(scope.eval(iterableExpr));

  if (!oldList) {
    jr.initListEl({ el, listAttr, list, iteratorName });
    return;
  }

  let noDiff = true;

  if (list.length !== oldList.length) {
    noDiff = false;
  }
  else {
    for (let [i, v] of list.entries()) {
      if (oldList[i] === v) {
        continue;
      }

      noDiff = false;
      break;
    }
  }

  if (noDiff) {
    return;
  }

  let diff = jr.diffLists(oldList, list);

  let oldLis = Array.from(el.children);
  el.innerHTML = '';

  for (let x of diff) {
    switch (x.type) {
      case 'existing':
        el.appendChild(oldLis[x.from]);
        break;

      case 'new': {
        let newLi = jr(el.jr.refListItem.cloneNode(true));

        newLi.jr.listItem = {
          iteratorName,
          value: x.value,
        };

        el.appendChild(newLi);

        break;
      }

      default:
        throw new Error('???');
        break;
    }
  }
};

// TODO: Review computational complexity if too slow
// on realistic benchmarks.
jr.diffLists = (a, b) => {
  let diffs = {
    moved: [],
    added: [],
  };

  for (let [i, x] of a.entries()) {
    if (b[i] === x) {
      continue;
    }

    let newIndex = b.findIndex((y, j) => {
      if (y !== x) {
        return false;
      }

      return !diffs.moved.some(
        z => z.value === y && z.to !== j,
      );
    });

    if (newIndex === -1) {
      continue;
    }

    diffs.moved.push({
      value: x,
      from: i,
      to: newIndex,
    });
  }

  for (let [i, x] of b.entries()) {
    if (a[i] === x) {
      continue;
    }

    if (diffs.moved.some(y => y.value == x && y.to === i)) {
      continue;
    }

    diffs.added.push({
      value: x,
      to: i,
    });
  }

  return b.map((x, i) => {
    if (a[i] === x) {
      return { type: 'existing', from: i };
    }

    let moved = diffs.moved.find(y => y.to === i);

    return moved
      ? { type: 'existing', from: moved.from }
      : { type: 'new', value: x };
  });
};

jr.initListEl = ({ el, listAttr, list, iteratorName }) => {
  let refLi = el.jr.refListItem = el.firstElementChild;
  el.innerHTML = '';

  for (let x of list) {
    let li = jr(refLi.cloneNode(true));

    li.jr.listItem = {
      iteratorName,
      value: x,
    };

    el.appendChild(li);

    for (let el of [li, ...jr.find('*', li)]) {
      if (!document.contains(el)) {
        continue;
      }

      try {
        jr.initEl(el);
      }
      catch (err) {
        console.error(err);
      }
    }
  }
};

jr.updateEventAttr = (el, attrName) => {
  let indexEntry = jr.index.get(el);
  let attr = indexEntry.attrs[attrName];

  let evName = attrName.slice('jr-on-'.length);

  if (attr.handler) {
    el.removeEventListener(evName, attr.handler);
  }

  let scope = jr.getScope(el);
  let localsCode = scope.getLocals().join(', ');
  let handlerCode = attr.value = el.getAttribute(attrName);

  // FIXME: This is awfully broken, but will do for now.
  if (handlerCode.trim().includes('=')) {
    let [lhs, rhs] = handlerCode.split('=').map(x => x.trim());

    handlerCode =
      `$jrScope.set(${JSON.stringify(lhs)}, ${rhs})`;
  }

  attr.handler = new Function(
    '$jr', '$jrScope', '$jrEv', `
      const { ${localsCode} } = $jrScope.hash;
      const jr = Object.create($jr);

      jr.ev = $jrEv;

      ${handlerCode};
    `,
  ).bind(null, jr, scope);

  el.addEventListener(evName, attr.handler);
};

jr.updateEl = el => {
  try {
    let scope = jr.getScope(el);
    let indexEntry = jr.index.get(el);

    for (let attr of Object.values(indexEntry.attrs)) {
      if (attr.name === 'jr-if') {
        jr.updateIfEl(el);
        continue;
      }

      if (attr.name === 'jr-list') {
        jr.updateListEl(el);
        continue;
      }

      if (attr.name.startsWith('jr-on-')) {
        jr.updateEventAttr(el, attr.name);
      }

      let computed = attr.value =
        el.getAttribute(attr.name);

      let interpRe = /\${([^}]+)}/g;
      let interpList = [];

      while (true) {
        let reRes = interpRe.exec(computed);

        if (!reRes) {
          break;
        }

        interpList.push(reRes[1]);
      }

      for (let expr of interpList) {
        let value = scope.eval(expr);

        computed = computed.replace(
          new RegExp(jr.escapeRegExp(`\${${expr}}`), 'g'),
          value,
        );
      }

      if (attr.name.endsWith('.bind')) {
        computed = scope.eval(computed);
      }

      if (computed === attr.computed) {
        continue;
      }

      attr.computed = computed;

      let targetName = attr.name
        .slice('jr-'.length)
        .replace(/\.bind$/, '');

      if (targetName === 'textcontent') {
        el.textContent = computed;
      }
      else {
        let propTargets = ['value'];

        if (!propTargets.includes(targetName)) {
          el.setAttribute(targetName, computed);
        }
        else {
          el[targetName] = computed;
        }
      }
    }
  }
  catch (err) {
    err.message =
      `${err.message} while updating ${jr.elAttrsToString(el)}`;

    throw err;
  }
};

jr.update = () => {
  for (let el of jr.index.keys()) {
    try {
      jr.updateEl(el);
    }
    catch (err) {
      console.error(err);
    }
  }
};

},{"./helpers":2,"mutation-summary":4}],4:[function(require,module,exports){
// Copyright 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MutationObserverCtor;
if (typeof WebKitMutationObserver !== 'undefined')
    MutationObserverCtor = WebKitMutationObserver;
else
    MutationObserverCtor = MutationObserver;
if (MutationObserverCtor === undefined) {
    console.error('DOM Mutation Observers are required.');
    console.error('https://developer.mozilla.org/en-US/docs/DOM/MutationObserver');
    throw Error('DOM Mutation Observers are required');
}
var NodeMap = (function () {
    function NodeMap() {
        this.nodes = [];
        this.values = [];
    }
    NodeMap.prototype.isIndex = function (s) {
        return +s === s >>> 0;
    };
    NodeMap.prototype.nodeId = function (node) {
        var id = node[NodeMap.ID_PROP];
        if (!id)
            id = node[NodeMap.ID_PROP] = NodeMap.nextId_++;
        return id;
    };
    NodeMap.prototype.set = function (node, value) {
        var id = this.nodeId(node);
        this.nodes[id] = node;
        this.values[id] = value;
    };
    NodeMap.prototype.get = function (node) {
        var id = this.nodeId(node);
        return this.values[id];
    };
    NodeMap.prototype.has = function (node) {
        return this.nodeId(node) in this.nodes;
    };
    NodeMap.prototype.delete = function (node) {
        var id = this.nodeId(node);
        delete this.nodes[id];
        this.values[id] = undefined;
    };
    NodeMap.prototype.keys = function () {
        var nodes = [];
        for (var id in this.nodes) {
            if (!this.isIndex(id))
                continue;
            nodes.push(this.nodes[id]);
        }
        return nodes;
    };
    NodeMap.ID_PROP = '__mutation_summary_node_map_id__';
    NodeMap.nextId_ = 1;
    return NodeMap;
})();
/**
 *  var reachableMatchableProduct = [
 *  //  STAYED_OUT,  ENTERED,     STAYED_IN,   EXITED
 *    [ STAYED_OUT,  STAYED_OUT,  STAYED_OUT,  STAYED_OUT ], // STAYED_OUT
 *    [ STAYED_OUT,  ENTERED,     ENTERED,     STAYED_OUT ], // ENTERED
 *    [ STAYED_OUT,  ENTERED,     STAYED_IN,   EXITED     ], // STAYED_IN
 *    [ STAYED_OUT,  STAYED_OUT,  EXITED,      EXITED     ]  // EXITED
 *  ];
 */
var Movement;
(function (Movement) {
    Movement[Movement["STAYED_OUT"] = 0] = "STAYED_OUT";
    Movement[Movement["ENTERED"] = 1] = "ENTERED";
    Movement[Movement["STAYED_IN"] = 2] = "STAYED_IN";
    Movement[Movement["REPARENTED"] = 3] = "REPARENTED";
    Movement[Movement["REORDERED"] = 4] = "REORDERED";
    Movement[Movement["EXITED"] = 5] = "EXITED";
})(Movement || (Movement = {}));
function enteredOrExited(changeType) {
    return changeType === Movement.ENTERED || changeType === Movement.EXITED;
}
var NodeChange = (function () {
    function NodeChange(node, childList, attributes, characterData, oldParentNode, added, attributeOldValues, characterDataOldValue) {
        if (childList === void 0) { childList = false; }
        if (attributes === void 0) { attributes = false; }
        if (characterData === void 0) { characterData = false; }
        if (oldParentNode === void 0) { oldParentNode = null; }
        if (added === void 0) { added = false; }
        if (attributeOldValues === void 0) { attributeOldValues = null; }
        if (characterDataOldValue === void 0) { characterDataOldValue = null; }
        this.node = node;
        this.childList = childList;
        this.attributes = attributes;
        this.characterData = characterData;
        this.oldParentNode = oldParentNode;
        this.added = added;
        this.attributeOldValues = attributeOldValues;
        this.characterDataOldValue = characterDataOldValue;
        this.isCaseInsensitive =
            this.node.nodeType === Node.ELEMENT_NODE &&
                this.node instanceof HTMLElement &&
                this.node.ownerDocument instanceof HTMLDocument;
    }
    NodeChange.prototype.getAttributeOldValue = function (name) {
        if (!this.attributeOldValues)
            return undefined;
        if (this.isCaseInsensitive)
            name = name.toLowerCase();
        return this.attributeOldValues[name];
    };
    NodeChange.prototype.getAttributeNamesMutated = function () {
        var names = [];
        if (!this.attributeOldValues)
            return names;
        for (var name in this.attributeOldValues) {
            names.push(name);
        }
        return names;
    };
    NodeChange.prototype.attributeMutated = function (name, oldValue) {
        this.attributes = true;
        this.attributeOldValues = this.attributeOldValues || {};
        if (name in this.attributeOldValues)
            return;
        this.attributeOldValues[name] = oldValue;
    };
    NodeChange.prototype.characterDataMutated = function (oldValue) {
        if (this.characterData)
            return;
        this.characterData = true;
        this.characterDataOldValue = oldValue;
    };
    // Note: is it possible to receive a removal followed by a removal. This
    // can occur if the removed node is added to an non-observed node, that
    // node is added to the observed area, and then the node removed from
    // it.
    NodeChange.prototype.removedFromParent = function (parent) {
        this.childList = true;
        if (this.added || this.oldParentNode)
            this.added = false;
        else
            this.oldParentNode = parent;
    };
    NodeChange.prototype.insertedIntoParent = function () {
        this.childList = true;
        this.added = true;
    };
    // An node's oldParent is
    //   -its present parent, if its parentNode was not changed.
    //   -null if the first thing that happened to it was an add.
    //   -the node it was removed from if the first thing that happened to it
    //      was a remove.
    NodeChange.prototype.getOldParent = function () {
        if (this.childList) {
            if (this.oldParentNode)
                return this.oldParentNode;
            if (this.added)
                return null;
        }
        return this.node.parentNode;
    };
    return NodeChange;
})();
var ChildListChange = (function () {
    function ChildListChange() {
        this.added = new NodeMap();
        this.removed = new NodeMap();
        this.maybeMoved = new NodeMap();
        this.oldPrevious = new NodeMap();
        this.moved = undefined;
    }
    return ChildListChange;
})();
var TreeChanges = (function (_super) {
    __extends(TreeChanges, _super);
    function TreeChanges(rootNode, mutations) {
        _super.call(this);
        this.rootNode = rootNode;
        this.reachableCache = undefined;
        this.wasReachableCache = undefined;
        this.anyParentsChanged = false;
        this.anyAttributesChanged = false;
        this.anyCharacterDataChanged = false;
        for (var m = 0; m < mutations.length; m++) {
            var mutation = mutations[m];
            switch (mutation.type) {
                case 'childList':
                    this.anyParentsChanged = true;
                    for (var i = 0; i < mutation.removedNodes.length; i++) {
                        var node = mutation.removedNodes[i];
                        this.getChange(node).removedFromParent(mutation.target);
                    }
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var node = mutation.addedNodes[i];
                        this.getChange(node).insertedIntoParent();
                    }
                    break;
                case 'attributes':
                    this.anyAttributesChanged = true;
                    var change = this.getChange(mutation.target);
                    change.attributeMutated(mutation.attributeName, mutation.oldValue);
                    break;
                case 'characterData':
                    this.anyCharacterDataChanged = true;
                    var change = this.getChange(mutation.target);
                    change.characterDataMutated(mutation.oldValue);
                    break;
            }
        }
    }
    TreeChanges.prototype.getChange = function (node) {
        var change = this.get(node);
        if (!change) {
            change = new NodeChange(node);
            this.set(node, change);
        }
        return change;
    };
    TreeChanges.prototype.getOldParent = function (node) {
        var change = this.get(node);
        return change ? change.getOldParent() : node.parentNode;
    };
    TreeChanges.prototype.getIsReachable = function (node) {
        if (node === this.rootNode)
            return true;
        if (!node)
            return false;
        this.reachableCache = this.reachableCache || new NodeMap();
        var isReachable = this.reachableCache.get(node);
        if (isReachable === undefined) {
            isReachable = this.getIsReachable(node.parentNode);
            this.reachableCache.set(node, isReachable);
        }
        return isReachable;
    };
    // A node wasReachable if its oldParent wasReachable.
    TreeChanges.prototype.getWasReachable = function (node) {
        if (node === this.rootNode)
            return true;
        if (!node)
            return false;
        this.wasReachableCache = this.wasReachableCache || new NodeMap();
        var wasReachable = this.wasReachableCache.get(node);
        if (wasReachable === undefined) {
            wasReachable = this.getWasReachable(this.getOldParent(node));
            this.wasReachableCache.set(node, wasReachable);
        }
        return wasReachable;
    };
    TreeChanges.prototype.reachabilityChange = function (node) {
        if (this.getIsReachable(node)) {
            return this.getWasReachable(node) ?
                Movement.STAYED_IN : Movement.ENTERED;
        }
        return this.getWasReachable(node) ?
            Movement.EXITED : Movement.STAYED_OUT;
    };
    return TreeChanges;
})(NodeMap);
var MutationProjection = (function () {
    // TOOD(any)
    function MutationProjection(rootNode, mutations, selectors, calcReordered, calcOldPreviousSibling) {
        this.rootNode = rootNode;
        this.mutations = mutations;
        this.selectors = selectors;
        this.calcReordered = calcReordered;
        this.calcOldPreviousSibling = calcOldPreviousSibling;
        this.treeChanges = new TreeChanges(rootNode, mutations);
        this.entered = [];
        this.exited = [];
        this.stayedIn = new NodeMap();
        this.visited = new NodeMap();
        this.childListChangeMap = undefined;
        this.characterDataOnly = undefined;
        this.matchCache = undefined;
        this.processMutations();
    }
    MutationProjection.prototype.processMutations = function () {
        if (!this.treeChanges.anyParentsChanged &&
            !this.treeChanges.anyAttributesChanged)
            return;
        var changedNodes = this.treeChanges.keys();
        for (var i = 0; i < changedNodes.length; i++) {
            this.visitNode(changedNodes[i], undefined);
        }
    };
    MutationProjection.prototype.visitNode = function (node, parentReachable) {
        if (this.visited.has(node))
            return;
        this.visited.set(node, true);
        var change = this.treeChanges.get(node);
        var reachable = parentReachable;
        // node inherits its parent's reachability change unless
        // its parentNode was mutated.
        if ((change && change.childList) || reachable == undefined)
            reachable = this.treeChanges.reachabilityChange(node);
        if (reachable === Movement.STAYED_OUT)
            return;
        // Cache match results for sub-patterns.
        this.matchabilityChange(node);
        if (reachable === Movement.ENTERED) {
            this.entered.push(node);
        }
        else if (reachable === Movement.EXITED) {
            this.exited.push(node);
            this.ensureHasOldPreviousSiblingIfNeeded(node);
        }
        else if (reachable === Movement.STAYED_IN) {
            var movement = Movement.STAYED_IN;
            if (change && change.childList) {
                if (change.oldParentNode !== node.parentNode) {
                    movement = Movement.REPARENTED;
                    this.ensureHasOldPreviousSiblingIfNeeded(node);
                }
                else if (this.calcReordered && this.wasReordered(node)) {
                    movement = Movement.REORDERED;
                }
            }
            this.stayedIn.set(node, movement);
        }
        if (reachable === Movement.STAYED_IN)
            return;
        // reachable === ENTERED || reachable === EXITED.
        for (var child = node.firstChild; child; child = child.nextSibling) {
            this.visitNode(child, reachable);
        }
    };
    MutationProjection.prototype.ensureHasOldPreviousSiblingIfNeeded = function (node) {
        if (!this.calcOldPreviousSibling)
            return;
        this.processChildlistChanges();
        var parentNode = node.parentNode;
        var nodeChange = this.treeChanges.get(node);
        if (nodeChange && nodeChange.oldParentNode)
            parentNode = nodeChange.oldParentNode;
        var change = this.childListChangeMap.get(parentNode);
        if (!change) {
            change = new ChildListChange();
            this.childListChangeMap.set(parentNode, change);
        }
        if (!change.oldPrevious.has(node)) {
            change.oldPrevious.set(node, node.previousSibling);
        }
    };
    MutationProjection.prototype.getChanged = function (summary, selectors, characterDataOnly) {
        this.selectors = selectors;
        this.characterDataOnly = characterDataOnly;
        for (var i = 0; i < this.entered.length; i++) {
            var node = this.entered[i];
            var matchable = this.matchabilityChange(node);
            if (matchable === Movement.ENTERED || matchable === Movement.STAYED_IN)
                summary.added.push(node);
        }
        var stayedInNodes = this.stayedIn.keys();
        for (var i = 0; i < stayedInNodes.length; i++) {
            var node = stayedInNodes[i];
            var matchable = this.matchabilityChange(node);
            if (matchable === Movement.ENTERED) {
                summary.added.push(node);
            }
            else if (matchable === Movement.EXITED) {
                summary.removed.push(node);
            }
            else if (matchable === Movement.STAYED_IN && (summary.reparented || summary.reordered)) {
                var movement = this.stayedIn.get(node);
                if (summary.reparented && movement === Movement.REPARENTED)
                    summary.reparented.push(node);
                else if (summary.reordered && movement === Movement.REORDERED)
                    summary.reordered.push(node);
            }
        }
        for (var i = 0; i < this.exited.length; i++) {
            var node = this.exited[i];
            var matchable = this.matchabilityChange(node);
            if (matchable === Movement.EXITED || matchable === Movement.STAYED_IN)
                summary.removed.push(node);
        }
    };
    MutationProjection.prototype.getOldParentNode = function (node) {
        var change = this.treeChanges.get(node);
        if (change && change.childList)
            return change.oldParentNode ? change.oldParentNode : null;
        var reachabilityChange = this.treeChanges.reachabilityChange(node);
        if (reachabilityChange === Movement.STAYED_OUT || reachabilityChange === Movement.ENTERED)
            throw Error('getOldParentNode requested on invalid node.');
        return node.parentNode;
    };
    MutationProjection.prototype.getOldPreviousSibling = function (node) {
        var parentNode = node.parentNode;
        var nodeChange = this.treeChanges.get(node);
        if (nodeChange && nodeChange.oldParentNode)
            parentNode = nodeChange.oldParentNode;
        var change = this.childListChangeMap.get(parentNode);
        if (!change)
            throw Error('getOldPreviousSibling requested on invalid node.');
        return change.oldPrevious.get(node);
    };
    MutationProjection.prototype.getOldAttribute = function (element, attrName) {
        var change = this.treeChanges.get(element);
        if (!change || !change.attributes)
            throw Error('getOldAttribute requested on invalid node.');
        var value = change.getAttributeOldValue(attrName);
        if (value === undefined)
            throw Error('getOldAttribute requested for unchanged attribute name.');
        return value;
    };
    MutationProjection.prototype.attributeChangedNodes = function (includeAttributes) {
        if (!this.treeChanges.anyAttributesChanged)
            return {}; // No attributes mutations occurred.
        var attributeFilter;
        var caseInsensitiveFilter;
        if (includeAttributes) {
            attributeFilter = {};
            caseInsensitiveFilter = {};
            for (var i = 0; i < includeAttributes.length; i++) {
                var attrName = includeAttributes[i];
                attributeFilter[attrName] = true;
                caseInsensitiveFilter[attrName.toLowerCase()] = attrName;
            }
        }
        var result = {};
        var nodes = this.treeChanges.keys();
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var change = this.treeChanges.get(node);
            if (!change.attributes)
                continue;
            if (Movement.STAYED_IN !== this.treeChanges.reachabilityChange(node) ||
                Movement.STAYED_IN !== this.matchabilityChange(node)) {
                continue;
            }
            var element = node;
            var changedAttrNames = change.getAttributeNamesMutated();
            for (var j = 0; j < changedAttrNames.length; j++) {
                var attrName = changedAttrNames[j];
                if (attributeFilter &&
                    !attributeFilter[attrName] &&
                    !(change.isCaseInsensitive && caseInsensitiveFilter[attrName])) {
                    continue;
                }
                var oldValue = change.getAttributeOldValue(attrName);
                if (oldValue === element.getAttribute(attrName))
                    continue;
                if (caseInsensitiveFilter && change.isCaseInsensitive)
                    attrName = caseInsensitiveFilter[attrName];
                result[attrName] = result[attrName] || [];
                result[attrName].push(element);
            }
        }
        return result;
    };
    MutationProjection.prototype.getOldCharacterData = function (node) {
        var change = this.treeChanges.get(node);
        if (!change || !change.characterData)
            throw Error('getOldCharacterData requested on invalid node.');
        return change.characterDataOldValue;
    };
    MutationProjection.prototype.getCharacterDataChanged = function () {
        if (!this.treeChanges.anyCharacterDataChanged)
            return []; // No characterData mutations occurred.
        var nodes = this.treeChanges.keys();
        var result = [];
        for (var i = 0; i < nodes.length; i++) {
            var target = nodes[i];
            if (Movement.STAYED_IN !== this.treeChanges.reachabilityChange(target))
                continue;
            var change = this.treeChanges.get(target);
            if (!change.characterData ||
                target.textContent == change.characterDataOldValue)
                continue;
            result.push(target);
        }
        return result;
    };
    MutationProjection.prototype.computeMatchabilityChange = function (selector, el) {
        if (!this.matchCache)
            this.matchCache = [];
        if (!this.matchCache[selector.uid])
            this.matchCache[selector.uid] = new NodeMap();
        var cache = this.matchCache[selector.uid];
        var result = cache.get(el);
        if (result === undefined) {
            result = selector.matchabilityChange(el, this.treeChanges.get(el));
            cache.set(el, result);
        }
        return result;
    };
    MutationProjection.prototype.matchabilityChange = function (node) {
        var _this = this;
        // TODO(rafaelw): Include PI, CDATA?
        // Only include text nodes.
        if (this.characterDataOnly) {
            switch (node.nodeType) {
                case Node.COMMENT_NODE:
                case Node.TEXT_NODE:
                    return Movement.STAYED_IN;
                default:
                    return Movement.STAYED_OUT;
            }
        }
        // No element filter. Include all nodes.
        if (!this.selectors)
            return Movement.STAYED_IN;
        // Element filter. Exclude non-elements.
        if (node.nodeType !== Node.ELEMENT_NODE)
            return Movement.STAYED_OUT;
        var el = node;
        var matchChanges = this.selectors.map(function (selector) {
            return _this.computeMatchabilityChange(selector, el);
        });
        var accum = Movement.STAYED_OUT;
        var i = 0;
        while (accum !== Movement.STAYED_IN && i < matchChanges.length) {
            switch (matchChanges[i]) {
                case Movement.STAYED_IN:
                    accum = Movement.STAYED_IN;
                    break;
                case Movement.ENTERED:
                    if (accum === Movement.EXITED)
                        accum = Movement.STAYED_IN;
                    else
                        accum = Movement.ENTERED;
                    break;
                case Movement.EXITED:
                    if (accum === Movement.ENTERED)
                        accum = Movement.STAYED_IN;
                    else
                        accum = Movement.EXITED;
                    break;
            }
            i++;
        }
        return accum;
    };
    MutationProjection.prototype.getChildlistChange = function (el) {
        var change = this.childListChangeMap.get(el);
        if (!change) {
            change = new ChildListChange();
            this.childListChangeMap.set(el, change);
        }
        return change;
    };
    MutationProjection.prototype.processChildlistChanges = function () {
        if (this.childListChangeMap)
            return;
        this.childListChangeMap = new NodeMap();
        for (var i = 0; i < this.mutations.length; i++) {
            var mutation = this.mutations[i];
            if (mutation.type != 'childList')
                continue;
            if (this.treeChanges.reachabilityChange(mutation.target) !== Movement.STAYED_IN &&
                !this.calcOldPreviousSibling)
                continue;
            var change = this.getChildlistChange(mutation.target);
            var oldPrevious = mutation.previousSibling;
            function recordOldPrevious(node, previous) {
                if (!node ||
                    change.oldPrevious.has(node) ||
                    change.added.has(node) ||
                    change.maybeMoved.has(node))
                    return;
                if (previous &&
                    (change.added.has(previous) ||
                        change.maybeMoved.has(previous)))
                    return;
                change.oldPrevious.set(node, previous);
            }
            for (var j = 0; j < mutation.removedNodes.length; j++) {
                var node = mutation.removedNodes[j];
                recordOldPrevious(node, oldPrevious);
                if (change.added.has(node)) {
                    change.added.delete(node);
                }
                else {
                    change.removed.set(node, true);
                    change.maybeMoved.delete(node);
                }
                oldPrevious = node;
            }
            recordOldPrevious(mutation.nextSibling, oldPrevious);
            for (var j = 0; j < mutation.addedNodes.length; j++) {
                var node = mutation.addedNodes[j];
                if (change.removed.has(node)) {
                    change.removed.delete(node);
                    change.maybeMoved.set(node, true);
                }
                else {
                    change.added.set(node, true);
                }
            }
        }
    };
    MutationProjection.prototype.wasReordered = function (node) {
        if (!this.treeChanges.anyParentsChanged)
            return false;
        this.processChildlistChanges();
        var parentNode = node.parentNode;
        var nodeChange = this.treeChanges.get(node);
        if (nodeChange && nodeChange.oldParentNode)
            parentNode = nodeChange.oldParentNode;
        var change = this.childListChangeMap.get(parentNode);
        if (!change)
            return false;
        if (change.moved)
            return change.moved.get(node);
        change.moved = new NodeMap();
        var pendingMoveDecision = new NodeMap();
        function isMoved(node) {
            if (!node)
                return false;
            if (!change.maybeMoved.has(node))
                return false;
            var didMove = change.moved.get(node);
            if (didMove !== undefined)
                return didMove;
            if (pendingMoveDecision.has(node)) {
                didMove = true;
            }
            else {
                pendingMoveDecision.set(node, true);
                didMove = getPrevious(node) !== getOldPrevious(node);
            }
            if (pendingMoveDecision.has(node)) {
                pendingMoveDecision.delete(node);
                change.moved.set(node, didMove);
            }
            else {
                didMove = change.moved.get(node);
            }
            return didMove;
        }
        var oldPreviousCache = new NodeMap();
        function getOldPrevious(node) {
            var oldPrevious = oldPreviousCache.get(node);
            if (oldPrevious !== undefined)
                return oldPrevious;
            oldPrevious = change.oldPrevious.get(node);
            while (oldPrevious &&
                (change.removed.has(oldPrevious) || isMoved(oldPrevious))) {
                oldPrevious = getOldPrevious(oldPrevious);
            }
            if (oldPrevious === undefined)
                oldPrevious = node.previousSibling;
            oldPreviousCache.set(node, oldPrevious);
            return oldPrevious;
        }
        var previousCache = new NodeMap();
        function getPrevious(node) {
            if (previousCache.has(node))
                return previousCache.get(node);
            var previous = node.previousSibling;
            while (previous && (change.added.has(previous) || isMoved(previous)))
                previous = previous.previousSibling;
            previousCache.set(node, previous);
            return previous;
        }
        change.maybeMoved.keys().forEach(isMoved);
        return change.moved.get(node);
    };
    return MutationProjection;
})();
var Summary = (function () {
    function Summary(projection, query) {
        var _this = this;
        this.projection = projection;
        this.added = [];
        this.removed = [];
        this.reparented = query.all || query.element || query.characterData ? [] : undefined;
        this.reordered = query.all ? [] : undefined;
        projection.getChanged(this, query.elementFilter, query.characterData);
        if (query.all || query.attribute || query.attributeList) {
            var filter = query.attribute ? [query.attribute] : query.attributeList;
            var attributeChanged = projection.attributeChangedNodes(filter);
            if (query.attribute) {
                this.valueChanged = attributeChanged[query.attribute] || [];
            }
            else {
                this.attributeChanged = attributeChanged;
                if (query.attributeList) {
                    query.attributeList.forEach(function (attrName) {
                        if (!_this.attributeChanged.hasOwnProperty(attrName))
                            _this.attributeChanged[attrName] = [];
                    });
                }
            }
        }
        if (query.all || query.characterData) {
            var characterDataChanged = projection.getCharacterDataChanged();
            if (query.characterData)
                this.valueChanged = characterDataChanged;
            else
                this.characterDataChanged = characterDataChanged;
        }
        if (this.reordered)
            this.getOldPreviousSibling = projection.getOldPreviousSibling.bind(projection);
    }
    Summary.prototype.getOldParentNode = function (node) {
        return this.projection.getOldParentNode(node);
    };
    Summary.prototype.getOldAttribute = function (node, name) {
        return this.projection.getOldAttribute(node, name);
    };
    Summary.prototype.getOldCharacterData = function (node) {
        return this.projection.getOldCharacterData(node);
    };
    Summary.prototype.getOldPreviousSibling = function (node) {
        return this.projection.getOldPreviousSibling(node);
    };
    return Summary;
})();
// TODO(rafaelw): Allow ':' and '.' as valid name characters.
var validNameInitialChar = /[a-zA-Z_]+/;
var validNameNonInitialChar = /[a-zA-Z0-9_\-]+/;
// TODO(rafaelw): Consider allowing backslash in the attrValue.
// TODO(rafaelw): There's got a to be way to represent this state machine
// more compactly???
function escapeQuotes(value) {
    return '"' + value.replace(/"/, '\\\"') + '"';
}
var Qualifier = (function () {
    function Qualifier() {
    }
    Qualifier.prototype.matches = function (oldValue) {
        if (oldValue === null)
            return false;
        if (this.attrValue === undefined)
            return true;
        if (!this.contains)
            return this.attrValue == oldValue;
        var tokens = oldValue.split(' ');
        for (var i = 0; i < tokens.length; i++) {
            if (this.attrValue === tokens[i])
                return true;
        }
        return false;
    };
    Qualifier.prototype.toString = function () {
        if (this.attrName === 'class' && this.contains)
            return '.' + this.attrValue;
        if (this.attrName === 'id' && !this.contains)
            return '#' + this.attrValue;
        if (this.contains)
            return '[' + this.attrName + '~=' + escapeQuotes(this.attrValue) + ']';
        if ('attrValue' in this)
            return '[' + this.attrName + '=' + escapeQuotes(this.attrValue) + ']';
        return '[' + this.attrName + ']';
    };
    return Qualifier;
})();
var Selector = (function () {
    function Selector() {
        this.uid = Selector.nextUid++;
        this.qualifiers = [];
    }
    Object.defineProperty(Selector.prototype, "caseInsensitiveTagName", {
        get: function () {
            return this.tagName.toUpperCase();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Selector.prototype, "selectorString", {
        get: function () {
            return this.tagName + this.qualifiers.join('');
        },
        enumerable: true,
        configurable: true
    });
    Selector.prototype.isMatching = function (el) {
        return el[Selector.matchesSelector](this.selectorString);
    };
    Selector.prototype.wasMatching = function (el, change, isMatching) {
        if (!change || !change.attributes)
            return isMatching;
        var tagName = change.isCaseInsensitive ? this.caseInsensitiveTagName : this.tagName;
        if (tagName !== '*' && tagName !== el.tagName)
            return false;
        var attributeOldValues = [];
        var anyChanged = false;
        for (var i = 0; i < this.qualifiers.length; i++) {
            var qualifier = this.qualifiers[i];
            var oldValue = change.getAttributeOldValue(qualifier.attrName);
            attributeOldValues.push(oldValue);
            anyChanged = anyChanged || (oldValue !== undefined);
        }
        if (!anyChanged)
            return isMatching;
        for (var i = 0; i < this.qualifiers.length; i++) {
            var qualifier = this.qualifiers[i];
            var oldValue = attributeOldValues[i];
            if (oldValue === undefined)
                oldValue = el.getAttribute(qualifier.attrName);
            if (!qualifier.matches(oldValue))
                return false;
        }
        return true;
    };
    Selector.prototype.matchabilityChange = function (el, change) {
        var isMatching = this.isMatching(el);
        if (isMatching)
            return this.wasMatching(el, change, isMatching) ? Movement.STAYED_IN : Movement.ENTERED;
        else
            return this.wasMatching(el, change, isMatching) ? Movement.EXITED : Movement.STAYED_OUT;
    };
    Selector.parseSelectors = function (input) {
        var selectors = [];
        var currentSelector;
        var currentQualifier;
        function newSelector() {
            if (currentSelector) {
                if (currentQualifier) {
                    currentSelector.qualifiers.push(currentQualifier);
                    currentQualifier = undefined;
                }
                selectors.push(currentSelector);
            }
            currentSelector = new Selector();
        }
        function newQualifier() {
            if (currentQualifier)
                currentSelector.qualifiers.push(currentQualifier);
            currentQualifier = new Qualifier();
        }
        var WHITESPACE = /\s/;
        var valueQuoteChar;
        var SYNTAX_ERROR = 'Invalid or unsupported selector syntax.';
        var SELECTOR = 1;
        var TAG_NAME = 2;
        var QUALIFIER = 3;
        var QUALIFIER_NAME_FIRST_CHAR = 4;
        var QUALIFIER_NAME = 5;
        var ATTR_NAME_FIRST_CHAR = 6;
        var ATTR_NAME = 7;
        var EQUIV_OR_ATTR_QUAL_END = 8;
        var EQUAL = 9;
        var ATTR_QUAL_END = 10;
        var VALUE_FIRST_CHAR = 11;
        var VALUE = 12;
        var QUOTED_VALUE = 13;
        var SELECTOR_SEPARATOR = 14;
        var state = SELECTOR;
        var i = 0;
        while (i < input.length) {
            var c = input[i++];
            switch (state) {
                case SELECTOR:
                    if (c.match(validNameInitialChar)) {
                        newSelector();
                        currentSelector.tagName = c;
                        state = TAG_NAME;
                        break;
                    }
                    if (c == '*') {
                        newSelector();
                        currentSelector.tagName = '*';
                        state = QUALIFIER;
                        break;
                    }
                    if (c == '.') {
                        newSelector();
                        newQualifier();
                        currentSelector.tagName = '*';
                        currentQualifier.attrName = 'class';
                        currentQualifier.contains = true;
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '#') {
                        newSelector();
                        newQualifier();
                        currentSelector.tagName = '*';
                        currentQualifier.attrName = 'id';
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '[') {
                        newSelector();
                        newQualifier();
                        currentSelector.tagName = '*';
                        currentQualifier.attrName = '';
                        state = ATTR_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c.match(WHITESPACE))
                        break;
                    throw Error(SYNTAX_ERROR);
                case TAG_NAME:
                    if (c.match(validNameNonInitialChar)) {
                        currentSelector.tagName += c;
                        break;
                    }
                    if (c == '.') {
                        newQualifier();
                        currentQualifier.attrName = 'class';
                        currentQualifier.contains = true;
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '#') {
                        newQualifier();
                        currentQualifier.attrName = 'id';
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '[') {
                        newQualifier();
                        currentQualifier.attrName = '';
                        state = ATTR_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c.match(WHITESPACE)) {
                        state = SELECTOR_SEPARATOR;
                        break;
                    }
                    if (c == ',') {
                        state = SELECTOR;
                        break;
                    }
                    throw Error(SYNTAX_ERROR);
                case QUALIFIER:
                    if (c == '.') {
                        newQualifier();
                        currentQualifier.attrName = 'class';
                        currentQualifier.contains = true;
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '#') {
                        newQualifier();
                        currentQualifier.attrName = 'id';
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '[') {
                        newQualifier();
                        currentQualifier.attrName = '';
                        state = ATTR_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c.match(WHITESPACE)) {
                        state = SELECTOR_SEPARATOR;
                        break;
                    }
                    if (c == ',') {
                        state = SELECTOR;
                        break;
                    }
                    throw Error(SYNTAX_ERROR);
                case QUALIFIER_NAME_FIRST_CHAR:
                    if (c.match(validNameInitialChar)) {
                        currentQualifier.attrValue = c;
                        state = QUALIFIER_NAME;
                        break;
                    }
                    throw Error(SYNTAX_ERROR);
                case QUALIFIER_NAME:
                    if (c.match(validNameNonInitialChar)) {
                        currentQualifier.attrValue += c;
                        break;
                    }
                    if (c == '.') {
                        newQualifier();
                        currentQualifier.attrName = 'class';
                        currentQualifier.contains = true;
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '#') {
                        newQualifier();
                        currentQualifier.attrName = 'id';
                        state = QUALIFIER_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c == '[') {
                        newQualifier();
                        state = ATTR_NAME_FIRST_CHAR;
                        break;
                    }
                    if (c.match(WHITESPACE)) {
                        state = SELECTOR_SEPARATOR;
                        break;
                    }
                    if (c == ',') {
                        state = SELECTOR;
                        break;
                    }
                    throw Error(SYNTAX_ERROR);
                case ATTR_NAME_FIRST_CHAR:
                    if (c.match(validNameInitialChar)) {
                        currentQualifier.attrName = c;
                        state = ATTR_NAME;
                        break;
                    }
                    if (c.match(WHITESPACE))
                        break;
                    throw Error(SYNTAX_ERROR);
                case ATTR_NAME:
                    if (c.match(validNameNonInitialChar)) {
                        currentQualifier.attrName += c;
                        break;
                    }
                    if (c.match(WHITESPACE)) {
                        state = EQUIV_OR_ATTR_QUAL_END;
                        break;
                    }
                    if (c == '~') {
                        currentQualifier.contains = true;
                        state = EQUAL;
                        break;
                    }
                    if (c == '=') {
                        currentQualifier.attrValue = '';
                        state = VALUE_FIRST_CHAR;
                        break;
                    }
                    if (c == ']') {
                        state = QUALIFIER;
                        break;
                    }
                    throw Error(SYNTAX_ERROR);
                case EQUIV_OR_ATTR_QUAL_END:
                    if (c == '~') {
                        currentQualifier.contains = true;
                        state = EQUAL;
                        break;
                    }
                    if (c == '=') {
                        currentQualifier.attrValue = '';
                        state = VALUE_FIRST_CHAR;
                        break;
                    }
                    if (c == ']') {
                        state = QUALIFIER;
                        break;
                    }
                    if (c.match(WHITESPACE))
                        break;
                    throw Error(SYNTAX_ERROR);
                case EQUAL:
                    if (c == '=') {
                        currentQualifier.attrValue = '';
                        state = VALUE_FIRST_CHAR;
                        break;
                    }
                    throw Error(SYNTAX_ERROR);
                case ATTR_QUAL_END:
                    if (c == ']') {
                        state = QUALIFIER;
                        break;
                    }
                    if (c.match(WHITESPACE))
                        break;
                    throw Error(SYNTAX_ERROR);
                case VALUE_FIRST_CHAR:
                    if (c.match(WHITESPACE))
                        break;
                    if (c == '"' || c == "'") {
                        valueQuoteChar = c;
                        state = QUOTED_VALUE;
                        break;
                    }
                    currentQualifier.attrValue += c;
                    state = VALUE;
                    break;
                case VALUE:
                    if (c.match(WHITESPACE)) {
                        state = ATTR_QUAL_END;
                        break;
                    }
                    if (c == ']') {
                        state = QUALIFIER;
                        break;
                    }
                    if (c == "'" || c == '"')
                        throw Error(SYNTAX_ERROR);
                    currentQualifier.attrValue += c;
                    break;
                case QUOTED_VALUE:
                    if (c == valueQuoteChar) {
                        state = ATTR_QUAL_END;
                        break;
                    }
                    currentQualifier.attrValue += c;
                    break;
                case SELECTOR_SEPARATOR:
                    if (c.match(WHITESPACE))
                        break;
                    if (c == ',') {
                        state = SELECTOR;
                        break;
                    }
                    throw Error(SYNTAX_ERROR);
            }
        }
        switch (state) {
            case SELECTOR:
            case TAG_NAME:
            case QUALIFIER:
            case QUALIFIER_NAME:
            case SELECTOR_SEPARATOR:
                // Valid end states.
                newSelector();
                break;
            default:
                throw Error(SYNTAX_ERROR);
        }
        if (!selectors.length)
            throw Error(SYNTAX_ERROR);
        return selectors;
    };
    Selector.nextUid = 1;
    Selector.matchesSelector = (function () {
        var element = document.createElement('div');
        if (typeof element['webkitMatchesSelector'] === 'function')
            return 'webkitMatchesSelector';
        if (typeof element['mozMatchesSelector'] === 'function')
            return 'mozMatchesSelector';
        if (typeof element['msMatchesSelector'] === 'function')
            return 'msMatchesSelector';
        return 'matchesSelector';
    })();
    return Selector;
})();
var attributeFilterPattern = /^([a-zA-Z:_]+[a-zA-Z0-9_\-:\.]*)$/;
function validateAttribute(attribute) {
    if (typeof attribute != 'string')
        throw Error('Invalid request opion. attribute must be a non-zero length string.');
    attribute = attribute.trim();
    if (!attribute)
        throw Error('Invalid request opion. attribute must be a non-zero length string.');
    if (!attribute.match(attributeFilterPattern))
        throw Error('Invalid request option. invalid attribute name: ' + attribute);
    return attribute;
}
function validateElementAttributes(attribs) {
    if (!attribs.trim().length)
        throw Error('Invalid request option: elementAttributes must contain at least one attribute.');
    var lowerAttributes = {};
    var attributes = {};
    var tokens = attribs.split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
        var name = tokens[i];
        if (!name)
            continue;
        var name = validateAttribute(name);
        var nameLower = name.toLowerCase();
        if (lowerAttributes[nameLower])
            throw Error('Invalid request option: observing multiple case variations of the same attribute is not supported.');
        attributes[name] = true;
        lowerAttributes[nameLower] = true;
    }
    return Object.keys(attributes);
}
function elementFilterAttributes(selectors) {
    var attributes = {};
    selectors.forEach(function (selector) {
        selector.qualifiers.forEach(function (qualifier) {
            attributes[qualifier.attrName] = true;
        });
    });
    return Object.keys(attributes);
}
var MutationSummary = (function () {
    function MutationSummary(opts) {
        var _this = this;
        this.connected = false;
        this.options = MutationSummary.validateOptions(opts);
        this.observerOptions = MutationSummary.createObserverOptions(this.options.queries);
        this.root = this.options.rootNode;
        this.callback = this.options.callback;
        this.elementFilter = Array.prototype.concat.apply([], this.options.queries.map(function (query) {
            return query.elementFilter ? query.elementFilter : [];
        }));
        if (!this.elementFilter.length)
            this.elementFilter = undefined;
        this.calcReordered = this.options.queries.some(function (query) {
            return query.all;
        });
        this.queryValidators = []; // TODO(rafaelw): Shouldn't always define this.
        if (MutationSummary.createQueryValidator) {
            this.queryValidators = this.options.queries.map(function (query) {
                return MutationSummary.createQueryValidator(_this.root, query);
            });
        }
        this.observer = new MutationObserverCtor(function (mutations) {
            _this.observerCallback(mutations);
        });
        this.reconnect();
    }
    MutationSummary.createObserverOptions = function (queries) {
        var observerOptions = {
            childList: true,
            subtree: true
        };
        var attributeFilter;
        function observeAttributes(attributes) {
            if (observerOptions.attributes && !attributeFilter)
                return; // already observing all.
            observerOptions.attributes = true;
            observerOptions.attributeOldValue = true;
            if (!attributes) {
                // observe all.
                attributeFilter = undefined;
                return;
            }
            // add to observed.
            attributeFilter = attributeFilter || {};
            attributes.forEach(function (attribute) {
                attributeFilter[attribute] = true;
                attributeFilter[attribute.toLowerCase()] = true;
            });
        }
        queries.forEach(function (query) {
            if (query.characterData) {
                observerOptions.characterData = true;
                observerOptions.characterDataOldValue = true;
                return;
            }
            if (query.all) {
                observeAttributes();
                observerOptions.characterData = true;
                observerOptions.characterDataOldValue = true;
                return;
            }
            if (query.attribute) {
                observeAttributes([query.attribute.trim()]);
                return;
            }
            var attributes = elementFilterAttributes(query.elementFilter).concat(query.attributeList || []);
            if (attributes.length)
                observeAttributes(attributes);
        });
        if (attributeFilter)
            observerOptions.attributeFilter = Object.keys(attributeFilter);
        return observerOptions;
    };
    MutationSummary.validateOptions = function (options) {
        for (var prop in options) {
            if (!(prop in MutationSummary.optionKeys))
                throw Error('Invalid option: ' + prop);
        }
        if (typeof options.callback !== 'function')
            throw Error('Invalid options: callback is required and must be a function');
        if (!options.queries || !options.queries.length)
            throw Error('Invalid options: queries must contain at least one query request object.');
        var opts = {
            callback: options.callback,
            rootNode: options.rootNode || document,
            observeOwnChanges: !!options.observeOwnChanges,
            oldPreviousSibling: !!options.oldPreviousSibling,
            queries: []
        };
        for (var i = 0; i < options.queries.length; i++) {
            var request = options.queries[i];
            // all
            if (request.all) {
                if (Object.keys(request).length > 1)
                    throw Error('Invalid request option. all has no options.');
                opts.queries.push({ all: true });
                continue;
            }
            // attribute
            if ('attribute' in request) {
                var query = {
                    attribute: validateAttribute(request.attribute)
                };
                query.elementFilter = Selector.parseSelectors('*[' + query.attribute + ']');
                if (Object.keys(request).length > 1)
                    throw Error('Invalid request option. attribute has no options.');
                opts.queries.push(query);
                continue;
            }
            // element
            if ('element' in request) {
                var requestOptionCount = Object.keys(request).length;
                var query = {
                    element: request.element,
                    elementFilter: Selector.parseSelectors(request.element)
                };
                if (request.hasOwnProperty('elementAttributes')) {
                    query.attributeList = validateElementAttributes(request.elementAttributes);
                    requestOptionCount--;
                }
                if (requestOptionCount > 1)
                    throw Error('Invalid request option. element only allows elementAttributes option.');
                opts.queries.push(query);
                continue;
            }
            // characterData
            if (request.characterData) {
                if (Object.keys(request).length > 1)
                    throw Error('Invalid request option. characterData has no options.');
                opts.queries.push({ characterData: true });
                continue;
            }
            throw Error('Invalid request option. Unknown query request.');
        }
        return opts;
    };
    MutationSummary.prototype.createSummaries = function (mutations) {
        if (!mutations || !mutations.length)
            return [];
        var projection = new MutationProjection(this.root, mutations, this.elementFilter, this.calcReordered, this.options.oldPreviousSibling);
        var summaries = [];
        for (var i = 0; i < this.options.queries.length; i++) {
            summaries.push(new Summary(projection, this.options.queries[i]));
        }
        return summaries;
    };
    MutationSummary.prototype.checkpointQueryValidators = function () {
        this.queryValidators.forEach(function (validator) {
            if (validator)
                validator.recordPreviousState();
        });
    };
    MutationSummary.prototype.runQueryValidators = function (summaries) {
        this.queryValidators.forEach(function (validator, index) {
            if (validator)
                validator.validate(summaries[index]);
        });
    };
    MutationSummary.prototype.changesToReport = function (summaries) {
        return summaries.some(function (summary) {
            var summaryProps = ['added', 'removed', 'reordered', 'reparented',
                'valueChanged', 'characterDataChanged'];
            if (summaryProps.some(function (prop) { return summary[prop] && summary[prop].length; }))
                return true;
            if (summary.attributeChanged) {
                var attrNames = Object.keys(summary.attributeChanged);
                var attrsChanged = attrNames.some(function (attrName) {
                    return !!summary.attributeChanged[attrName].length;
                });
                if (attrsChanged)
                    return true;
            }
            return false;
        });
    };
    MutationSummary.prototype.observerCallback = function (mutations) {
        if (!this.options.observeOwnChanges)
            this.observer.disconnect();
        var summaries = this.createSummaries(mutations);
        this.runQueryValidators(summaries);
        if (this.options.observeOwnChanges)
            this.checkpointQueryValidators();
        if (this.changesToReport(summaries))
            this.callback(summaries);
        // disconnect() may have been called during the callback.
        if (!this.options.observeOwnChanges && this.connected) {
            this.checkpointQueryValidators();
            this.observer.observe(this.root, this.observerOptions);
        }
    };
    MutationSummary.prototype.reconnect = function () {
        if (this.connected)
            throw Error('Already connected');
        this.observer.observe(this.root, this.observerOptions);
        this.connected = true;
        this.checkpointQueryValidators();
    };
    MutationSummary.prototype.takeSummaries = function () {
        if (!this.connected)
            throw Error('Not connected');
        var summaries = this.createSummaries(this.observer.takeRecords());
        return this.changesToReport(summaries) ? summaries : undefined;
    };
    MutationSummary.prototype.disconnect = function () {
        var summaries = this.takeSummaries();
        this.observer.disconnect();
        this.connected = false;
        return summaries;
    };
    MutationSummary.NodeMap = NodeMap; // exposed for use in TreeMirror.
    MutationSummary.parseElementFilter = Selector.parseSelectors; // exposed for testing.
    MutationSummary.optionKeys = {
        'callback': true,
        'queries': true,
        'rootNode': true,
        'oldPreviousSibling': true,
        'observeOwnChanges': true
    };
    return MutationSummary;
})();

module.exports = MutationSummary

},{}],5:[function(require,module,exports){
require('junior-ui/browserGlobal');

},{"junior-ui/browserGlobal":1}]},{},[5]);
