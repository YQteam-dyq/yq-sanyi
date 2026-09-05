var version = "0.0.0";
var BOOLEAN_ATTRS = new Set(["checked", "disabled", "hidden", "selected", "readonly", "required", "autofocus", "open", "multiple", "muted", "itemscope", "noshade", "compact"]);
var VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
var definitions = new Map();
function parsePath(path) {
  const parts = path.split(".");
  if (parts.length === 0 || parts.some((p) => p.length === 0)) {
    throw new Error(`invalid path: ${path}`);
  }
  return parts;
}
function decodeEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function parseAttributeValue(value, attr, slots, nodeId) {
  if (value.includes("{{") && value.includes("}}")) {
    if (value.trim() === `{{${value.substring(2, value.length - 2).trim()}}}`) {
      const path = value.substring(2, value.length - 2).trim();
      const pathSegments = parsePath(path);
      if (BOOLEAN_ATTRS.has(attr)) {
        slots.push({ kind: "bool", nodeId, attr });
      } else {
        slots.push({ kind: "attr", nodeId, attr });
      }
      return pathSegments;
    } else {
      throw new Error(`attribute binding only supports whole value form: ${attr}="${value}"`);
    }
  }
  return [decodeEntities(value)];
}
function parseListSpec(value, keyAttr) {
  let itemVar = "item";
  let itemsPath = [];
  if (value.includes(" in ")) {
    const parts = value.split(" in ");
    if (parts.length !== 2) {
      throw new Error(`invalid yq-for format: ${value}`);
    }
    itemVar = parts[0].trim();
    itemsPath = parsePath(parts[1].trim());
  } else {
    itemsPath = parsePath(value.trim());
  }
  return { itemVar, itemsPath, keyProp: keyAttr };
}
function parseTemplate(name, template) {
  const slots = [];
  const nodes = [];
  let inList = false;
  let nodeId = 0;
  function error(message) {
    throw new Error(`[yq:parse] ${name}: ${message}`);
  }
  function parseNode(html) {
    const node = {
      id: nodeId++,
      tag: "",
      staticAttrs: {},
      dynAttrs: {},
      text: [],
      children: [],
      list: null
    };
    nodes.push(node);
    let i = 0;
    if (html.startsWith("<!--")) {
      const commentEnd = html.indexOf("-->");
      if (commentEnd === -1) error("unclosed comment");
      return { node, remaining: html.substring(commentEnd + 3) };
    }
    if (html.startsWith("<!DOCTYPE")) {
      const doctypeEnd = html.indexOf(">");
      if (doctypeEnd === -1) error("unclosed DOCTYPE");
      return { node, remaining: html.substring(doctypeEnd + 1) };
    }
    if (html[i] !== "<") error("expected < at start of tag");
    i++;
    const tagNameStart = i;
    while (i < html.length && !/[ \t\n\r>\/]/.test(html[i])) i++;
    node.tag = html.substring(tagNameStart, i);
    if (node.tag.length === 0) error("empty tag name");
    let inSelfClosing = false;
    let currentAttr = "";
    let currentAttrValue = [];
    let inQuote = null;
    while (i < html.length) {
      const char = html[i];
      if (inQuote) {
        if (char === inQuote) {
          inQuote = null;
          const value = currentAttrValue.join("");
          if (currentAttr === "yq-for") {
            if (inList) error("nested yq-for not allowed");
            inList = true;
            node.list = parseListSpec(value, node.staticAttrs["yq-key"] || null);
            delete node.staticAttrs["yq-key"];
          } else if (currentAttr === "yq-key") {
            if (!node.list) error("yq-key without yq-for");
            node.list.keyProp = value;
          } else {
            const dynValue = parseAttributeValue(value, currentAttr, slots, node.id);
            if (dynValue.length === 1 && dynValue[0] === value) {
              node.staticAttrs[currentAttr] = value;
            } else {
              node.dynAttrs[currentAttr] = dynValue;
            }
          }
          currentAttr = "";
          currentAttrValue = [];
        } else {
          currentAttrValue.push(char);
        }
        i++;
      } else if (char === '"' || char === "'") {
        inQuote = char;
        currentAttrValue = [];
        i++;
      } else if (char === ">") {
        i++;
        break;
      } else if (char === "/") {
        inSelfClosing = true;
        i++;
        if (i < html.length && html[i] === ">") {
          i++;
          break;
        }
      } else if (/[ \t\n\r]/.test(char)) {
        if (currentAttr.length > 0) {
          const value = currentAttrValue.join("");
          if (currentAttr === "yq-for") {
            if (inList) error("nested yq-for not allowed");
            inList = true;
            node.list = parseListSpec(value, node.staticAttrs["yq-key"] || null);
            delete node.staticAttrs["yq-key"];
          } else if (currentAttr === "yq-key") {
            if (!node.list) error("yq-key without yq-for");
            node.list.keyProp = value;
          } else {
            const dynValue = parseAttributeValue(value, currentAttr, slots, node.id);
            if (dynValue.length === 1 && dynValue[0] === value) {
              node.staticAttrs[currentAttr] = value;
            } else {
              node.dynAttrs[currentAttr] = dynValue;
            }
          }
          currentAttr = "";
          currentAttrValue = [];
        }
        i++;
      } else {
        if (currentAttr.length === 0) {
          currentAttr = char;
        } else {
          currentAttr += char;
        }
        i++;
      }
    }
    if (inQuote) error("unclosed attribute quote");
    if (currentAttr.length > 0) {
      const value = currentAttrValue.join("");
      if (currentAttr === "yq-for") {
        if (inList) error("nested yq-for not allowed");
        inList = true;
        node.list = parseListSpec(value, node.staticAttrs["yq-key"] || null);
        delete node.staticAttrs["yq-key"];
      } else if (currentAttr === "yq-key") {
        if (!node.list) error("yq-key without yq-for");
        node.list.keyProp = value;
      } else {
        const dynValue = parseAttributeValue(value, currentAttr, slots, node.id);
        if (dynValue.length === 1 && dynValue[0] === value) {
          node.staticAttrs[currentAttr] = value;
        } else {
          node.dynAttrs[currentAttr] = dynValue;
        }
      }
    }
    if (VOID_TAGS.has(node.tag) || inSelfClosing) {
      return { node, remaining: html.substring(i) };
    }
    const contentEnd = html.indexOf("</" + node.tag + ">");
    if (contentEnd === -1) error(`unclosed tag: ${node.tag}`);
    const content = html.substring(i, contentEnd);
    const afterClose = contentEnd + node.tag.length + 3;
    let childContent = content;
    while (childContent.length > 0) {
      const childResult = parseNode(childContent);
      node.children.push(childResult.node);
      childContent = childResult.remaining;
      if (childContent.trim().length === 0) break;
    }
    return { node, remaining: html.substring(afterClose) };
  }
  const trimmed = template.trim();
  if (trimmed.length === 0) error("empty template");
  let remaining = trimmed;
  let rootResult = null;
  while (remaining.length > 0) {
    const result = parseNode(remaining);
    if (!rootResult) rootResult = result;
    remaining = result.remaining;
    if (remaining.trim().length === 0) break;
  }
  if (!rootResult) error("no root element found");
  if (rootResult.remaining.length > 0) error("extra content after root element");
  const root = rootResult.node;
  if (root.list) error("root element cannot be yq-for");
  return { root, nodes, slots };
}
function createScriptFactory(script) {
  if (typeof script === "function") {
    return () => script;
  }
  if (typeof script === "string") {
    try {
      const fn = new Function("return " + script);
      return () => fn();
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw e;
      }
      throw new Error("invalid script string: " + e.message);
    }
  }
  return null;
}
function createRenderContext(state2, slots) {
  return {
    state: state2,
    slots,
    nodeCache: new Map(),
    listElements: new Map()
  };
}
function cloneStaticNode(node) {
  const element = document.createElement(node.tag);
  element.dataset.yqNodeId = node.id.toString();
  for (const [attr, value] of Object.entries(node.staticAttrs)) {
    element.setAttribute(attr, value);
  }
  for (const [attr, parts] of Object.entries(node.dynAttrs)) {
    let currentValue = "";
    for (const part of parts) {
      if ("path" in part) {
        currentValue += "{{" + part.path.join(".") + "}}";
      } else {
        currentValue += part.static;
      }
    }
    element.setAttribute(attr, currentValue);
  }
  element.textContent = "";
  for (const part of node.text) {
    if ("path" in part) {
      element.textContent += "{{" + part.path.join(".") + "}}";
    } else {
      element.textContent += part.static;
    }
  }
  for (const child of node.children) {
    element.appendChild(cloneStaticNode(child));
  }
  return element;
}
function resolvePath(state2, path) {
  if (!path || path.length === 0) return void 0;
  let current = state2;
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = current[segment];
    } else {
      return void 0;
    }
  }
  return current;
}
function fillTextSlot(node, slot, context) {
  var _a;
  const parts = ((_a = node.textContent) == null ? void 0 : _a.split("")) || [];
  let currentText = "";
  for (let i = 0; i < parts.length; i++) {
    if (i === slot.partIndex) {
      const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
      currentText += String(value);
    }
    currentText += parts[i];
  }
  node.textContent = currentText;
}
function fillAttrSlot(node, slot, context) {
  const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
  if (value != null) {
    node.setAttribute(slot.attr, String(value));
  }
}
function fillBoolSlot(node, slot, context) {
  const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
  if (value) {
    node.setAttribute(slot.attr, "");
  } else {
    node.removeAttribute(slot.attr);
  }
}
function createListItem(cdo2, slot, item, index, context) {
  const fragment = document.createDocumentFragment();
  const itemState = { ...context.state, [slot.itemVar]: item };
  const itemContext = { ...context, state: itemState };
  const itemElement = cloneStaticNode(cdo2.root);
  fragment.appendChild(itemElement);
  for (const childSlot of cdo2.slots) {
    if (childSlot.kind === "text" && childSlot.nodeId === cdo2.root.id) {
      fillTextSlot(itemElement, childSlot, itemContext);
    } else if (childSlot.kind === "attr" && childSlot.nodeId === cdo2.root.id) {
      fillAttrSlot(itemElement, childSlot, itemContext);
    } else if (childSlot.kind === "bool" && childSlot.nodeId === cdo2.root.id) {
      fillBoolSlot(itemElement, childSlot, itemContext);
    }
  }
  return fragment.firstChild;
}
function fillListSlot(node, slot, context) {
  const items = resolvePath(context.state, slot.itemsPath) || [];
  const fragment = document.createDocumentFragment();
  const existingElements = Array.from(node.children);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = slot.keyProp ? String(item[slot.keyProp]) : String(i);
    const existingElement = existingElements.find((el) => el.dataset.yqKey === String(key));
    if (existingElement) {
      const itemElement = existingElement.cloneNode(true);
      itemElement.dataset.yqKey = String(key);
      fragment.appendChild(itemElement);
    } else {
      const itemElement = createListItem(cdo, slot, item, i, context);
      itemElement.dataset.yqKey = String(key);
      fragment.appendChild(itemElement);
    }
  }
  node.innerHTML = "";
  node.appendChild(fragment);
}
function renderSkeleton(cdo2, container) {
  const fragment = document.createDocumentFragment();
  const root = cloneStaticNode(cdo2.root);
  fragment.appendChild(root);
  container.appendChild(fragment);
  return root;
}
function fillSlots(cdo2, context) {
  const cache = new Map();
  function traverse(element) {
    if (element.dataset.yqNodeId) {
      const nodeId = parseInt(element.dataset.yqNodeId);
      cache.set(nodeId, element);
    }
    for (const child of Array.from(element.children)) {
      traverse(child);
    }
  }
  traverse(context.nodeCache.get(cdo2.root.id) || cdo2.root.tag === document.body.tagName ? document.body : context.nodeCache.get(0));
  for (const slot of cdo2.slots) {
    const node = cache.get(slot.nodeId);
    if (!node) continue;
    if (slot.kind === "text") {
      fillTextSlot(node, slot, context);
    } else if (slot.kind === "attr") {
      fillAttrSlot(node, slot, context);
    } else if (slot.kind === "bool") {
      fillBoolSlot(node, slot, context);
    } else if (slot.kind === "list") {
      fillListSlot(node, slot, context);
    }
  }
}
function updateSlots(cdo2, context) {
  var _a;
  const cache = new Map();
  function traverse(element) {
    if (element.dataset.yqNodeId) {
      const nodeId = parseInt(element.dataset.yqNodeId);
      cache.set(nodeId, element);
    }
    for (const child of Array.from(element.children)) {
      traverse(child);
    }
  }
  traverse(context.nodeCache.get(cdo2.root.id) || cdo2.root.tag === document.body.tagName ? document.body : context.nodeCache.get(0));
  for (const slot of cdo2.slots) {
    const node = cache.get(slot.nodeId);
    if (!node) continue;
    if (slot.kind === "text") {
      const parts = ((_a = node.textContent) == null ? void 0 : _a.split("")) || [];
      let currentText = "";
      let needsUpdate = false;
      for (let i = 0; i < parts.length; i++) {
        if (i === slot.partIndex) {
          const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
          const newValue = String(value);
          if (currentText.length > 0 || parts[i] !== newValue) {
            needsUpdate = true;
          }
          currentText += newValue;
        } else {
          currentText += parts[i];
        }
      }
      if (needsUpdate) {
        node.textContent = currentText;
      }
    } else if (slot.kind === "attr") {
      const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
      if (value != null) {
        node.setAttribute(slot.attr, String(value));
      } else {
        node.removeAttribute(slot.attr);
      }
    } else if (slot.kind === "bool") {
      const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
      if (value) {
        node.setAttribute(slot.attr, "");
      } else {
        node.removeAttribute(slot.attr);
      }
    } else if (slot.kind === "list") {
      const items = resolvePath(context.state, slot.itemsPath) || [];
      const fragment = document.createDocumentFragment();
      const existingElements = Array.from(node.children);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const key = slot.keyProp ? String(item[slot.keyProp]) : String(i);
        const existingElement = existingElements.find((el) => el.dataset.yqKey === String(key));
        if (existingElement) {
          const itemElement = existingElement.cloneNode(true);
          itemElement.dataset.yqKey = String(key);
          fragment.appendChild(itemElement);
        } else {
          const itemElement = createListItem(cdo2, slot, item, i, context);
          itemElement.dataset.yqKey = String(key);
          fragment.appendChild(itemElement);
        }
      }
      if (node.children.length !== items.length) {
        node.innerHTML = "";
        node.appendChild(fragment);
      }
    }
  }
}
var effectStack = [];
var batchDepth = 0;
var batchQueue = [];
var isFlushing = false;
function flushBatchQueue() {
  if (isFlushing) return;
  isFlushing = true;
  try {
    while (batchQueue.length > 0) {
      const job = batchQueue.shift();
      job == null ? void 0 : job();
    }
  } finally {
    isFlushing = false;
    batchDepth = 0;
  }
}
function scheduleFlush() {
  if (!isFlushing && batchQueue.length > 0) {
    Promise.resolve().then(flushBatchQueue);
  }
}
function trackState(state2) {
  if (effectStack.length > 0) {
    const currentEffect = effectStack[effectStack.length - 1];
    if (!currentEffect.dependencies.includes(state2)) {
      currentEffect.dependencies.push(state2);
    }
  }
}
function triggerState(state2) {
  if (batchDepth > 0) {
    batchQueue.push(() => {
      const dependents = new Set();
      function collectDependents2(effect2) {
        for (const dep of effect2.dependencies) {
          if (dep === state2) {
            dependents.add(effect2);
          }
        }
      }
      for (const effect2 of effectStack) {
        collectDependents2(effect2);
      }
      for (const effect2 of dependents) {
        if (effect2.dirty !== true) {
          effect2.dirty = true;
          effectStack.push(effect2);
          try {
            effect2.fn();
          } finally {
            effectStack.pop();
            effect2.dirty = false;
          }
        }
      }
    });
  } else {
    let collectDependents2 = function(effect2) {
      for (const dep of effect2.dependencies) {
        if (dep === state2) {
          dependents.add(effect2);
        }
      }
    };
    var collectDependents = collectDependents2;
    const dependents = new Set();
    for (const effect2 of effectStack) {
      collectDependents2(effect2);
    }
    for (const effect2 of dependents) {
      if (effect2.dirty !== true) {
        effect2.dirty = true;
        effectStack.push(effect2);
        try {
          effect2.fn();
        } finally {
          effectStack.pop();
          effect2.dirty = false;
        }
      }
    }
  }
  if (batchDepth === 0) {
    scheduleFlush();
  }
}
function state(initialValue) {
  let value = initialValue;
  const dependents = [];
  const stateObj = {
    get value() {
      trackState(stateObj);
      return value;
    },
    set value(newValue) {
      if (value !== newValue) {
        value = newValue;
        triggerState(stateObj);
      }
    },
    dispose() {
      dependents.length = 0;
    }
  };
  return stateObj;
}
function derived(computeFn) {
  let cachedValue;
  let dirty = true;
  const dependencies = [];
  const derivedObj = {
    get value() {
      if (dirty) {
        effectStack.push({ fn: () => {
        }, dependencies: [] });
        try {
          cachedValue = computeFn();
          dirty = false;
        } finally {
          const currentEffect = effectStack.pop();
          if (currentEffect) {
            dependencies.length = 0;
            dependencies.push(...currentEffect.dependencies);
          }
        }
      }
      trackState(derivedObj);
      return cachedValue;
    },
    dispose() {
      dependencies.length = 0;
    },
    dependencies
  };
  return derivedObj;
}
function effect(fn) {
  const dependencies = [];
  function wrappedFn() {
    effectStack.push({ fn: wrappedFn, dependencies, dirty: false });
    try {
      fn();
    } finally {
      effectStack.pop();
    }
  }
  wrappedFn();
}
function dumpReactiveState() {
  const states = [];
  const effects = [];
  function collectStates() {
    for (const effect2 of effectStack) {
      for (const state2 of effect2.dependencies) {
        if (!states.includes(state2)) {
          states.push(state2);
        }
      }
    }
  }
  collectStates();
  return { states, effects };
}
function define(name, definition) {
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError("component name must be a non-empty string");
  }
  if (typeof definition !== "object" || definition === null) {
    throw new TypeError("component definition must be an object");
  }
  if (!definition.template || typeof definition.template !== "string") {
    throw new TypeError("component definition must include template string");
  }
  if (typeof definition.style !== "string") {
    throw new TypeError("component definition must include style string");
  }
  if (typeof definition.script !== "function" && typeof definition.script !== "string" && definition.script !== null) {
    throw new TypeError("script must be function, string, or null");
  }
  if (definitions.has(name)) {
    throw new Error("duplicate component definition: " + name);
  }
  definitions.set(name, definition);
  return definition;
}
function lookup(name) {
  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError("component name must be a non-empty string");
  }
  const definition = definitions.get(name);
  if (!definition) return void 0;
  if (!definition.cdo) {
    const { root, nodes, slots } = parseTemplate(name, definition.template);
    definition.cdo = {
      name,
      root,
      nodes,
      styleText: definition.style,
      scriptFactory: createScriptFactory(definition.script),
      slots
    };
  }
  return { name, cdo: definition.cdo };
}
function createComponent(options) {
  const { name, template, script, container = document.body } = options;
  const cdo2 = parseTemplate(name, template);
  const state2 = {};
  const derivedStates = {};
  const effects = [];
  const context = createRenderContext(state2, cdo2.slots);
  const root = renderSkeleton(cdo2, container);
  const cleanup = () => {
    isUnmounted = true;
  };
  const wrappedFn = () => {
    if (isUnmounted) return;
    effectStack.push({ fn: wrappedFn, dependencies, dirty: false });
    try {
      fn(cleanup);
    } finally {
      effectStack.pop();
    }
  };
  wrappedFn();
  return { name, state: state2, derivedStates, effects: [wrappedFn], context, cdo: cdo2, container, root };
}
function mountComponent(instance) {
  fillSlots(instance.cdo, instance.context);
  if (instance.cdo.scriptFactory) {
    const scriptFn = instance.cdo.scriptFactory();
    if (typeof scriptFn === "function") {
      scriptFn();
    }
  }
}
function updateComponent(instance) {
  updateSlots(instance.cdo, instance.context);
}
function unmountComponent(instance) {
  instance.container.innerHTML = "";
  for (const cleanup of instance.effects) {
    cleanup();
  }
  instance.effects.length = 0;
}
export {
  createComponent,
  createRenderContext,
  createScriptFactory,
  define,
  derived,
  dumpReactiveState,
  effect,
  fillSlots,
  lookup,
  mountComponent,
  parseTemplate,
  renderSkeleton,
  state,
  unmountComponent,
  updateComponent,
  updateSlots,
  version
};
