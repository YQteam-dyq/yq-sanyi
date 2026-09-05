function createRenderContext(state2, slots) {
  return {
    state: state2,
    slots,
    nodeCache: new Map(),
    listElements: new Map()
  };
}
function renderSkeleton(cdo, container) {
  const fragment = document.createDocumentFragment();
  const root = cloneStaticNode(cdo.root);
  fragment.appendChild(root);
  container.appendChild(fragment);
  return root;
}
function cloneStaticNode(node) {
  const element = document.createElement(node.tag);
  element.dataset.yqNodeId = node.id.toString();
  for (const [attr, value] of Object.entries(node.staticAttrs)) {
    element.setAttribute(attr, value);
  }
  if (node.text.length > 0) {
    element.textContent = node.text.map(
      (part) => "static" in part ? part.static : ""
    ).join("");
  }
  for (const child of node.children) {
    element.appendChild(cloneStaticNode(child));
  }
  return element;
}
function fillSlots(cdo, context) {
  for (const slot of context.slots) {
    const node = context.nodeCache.get(slot.nodeId);
    if (!node) continue;
    switch (slot.kind) {
      case "text":
        fillTextSlot(node, slot, context);
        break;
      case "attr":
        fillAttrSlot(node, slot, context);
        break;
      case "bool":
        fillBoolSlot(node, slot, context);
        break;
      case "list":
        fillListSlot(cdo, node, slot, context);
        break;
    }
  }
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
function fillListSlot(cdo, node, slot, context) {
  const items = resolvePath(context.state, slot.itemsPath) || [];
  const keyProp = slot.keyProp || "id";
  if (!Array.isArray(items)) {
    console.warn(`List slot resolved to non-array:`, items);
    return;
  }
  const existingElements = context.listElements.get(slot.nodeId.toString()) || [];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = keyProp && item[keyProp] !== void 0 ? item[keyProp] : i;
    const existingElement = existingElements.find((el) => el.dataset.yqKey === String(key));
    if (existingElement) {
      fragment.appendChild(existingElement);
    } else {
      const itemElement = createListItem(cdo, slot, item, i, context);
      itemElement.dataset.yqKey = String(key);
      fragment.appendChild(itemElement);
    }
  }
  node.innerHTML = "";
  node.appendChild(fragment);
  context.listElements.set(slot.nodeId.toString(), Array.from(fragment.children));
}
function createListItem(cdo, slot, item, index, context) {
  const template = document.createElement("template");
  const itemState = { [slot.itemVar]: item, index };
  const tempContext = { ...context, state: { ...context.state, ...itemState } };
  const itemElement = cloneStaticNode(cdo.root);
  for (const child of cdo.root.children) {
    if (child.list) {
      const childElement = findElementByNodeId(itemElement, child.id);
      if (childElement) {
        fillListSlot(cdo, childElement, slot, tempContext);
      }
    }
  }
  return itemElement;
}
function findElementByNodeId(element, nodeId) {
  if (element.dataset.yqNodeId === String(nodeId)) {
    return element;
  }
  for (const child of Array.from(element.children)) {
    const found = findElementByNodeId(child, nodeId);
    if (found) return found;
  }
  return null;
}
function resolvePath(state2, path) {
  let current = state2;
  for (const part of path) {
    if (current == null) return void 0;
    current = current[part];
  }
  return current;
}
function updateSlots(cdo, context) {
  for (const slot of context.slots) {
    const node = context.nodeCache.get(slot.nodeId);
    if (!node) continue;
    switch (slot.kind) {
      case "text":
        updateTextSlot(node, slot, context);
        break;
      case "attr":
        updateAttrSlot(node, slot, context);
        break;
      case "bool":
        updateBoolSlot(node, slot, context);
        break;
      case "list":
        updateListSlot(cdo, node, slot, context);
        break;
    }
  }
}
function updateTextSlot(node, slot, context) {
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
function updateAttrSlot(node, slot, context) {
  const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
  if (value != null) {
    node.setAttribute(slot.attr, String(value));
  } else {
    node.removeAttribute(slot.attr);
  }
}
function updateBoolSlot(node, slot, context) {
  const value = slot.path ? resolvePath(context.state, slot.path) : void 0;
  if (value) {
    node.setAttribute(slot.attr, "");
  } else {
    node.removeAttribute(slot.attr);
  }
}
function updateListSlot(cdo, node, slot, context) {
  const items = resolvePath(context.state, slot.itemsPath) || [];
  const keyProp = slot.keyProp || "id";
  if (!Array.isArray(items)) {
    console.warn(`List slot updated to non-array:`, items);
    return;
  }
  const existingElements = context.listElements.get(slot.nodeId.toString()) || [];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = keyProp && item[keyProp] !== void 0 ? item[keyProp] : i;
    const existingElement = existingElements.find((el) => el.dataset.yqKey === String(key));
    if (existingElement) {
      fragment.appendChild(existingElement);
    } else {
      const itemElement = createListItem(cdo, slot, item, i, context);
      itemElement.dataset.yqKey = String(key);
      fragment.appendChild(itemElement);
    }
  }
  node.innerHTML = "";
  node.appendChild(fragment);
  context.listElements.set(slot.nodeId.toString(), Array.from(fragment.children));
}

var BOOLEAN_ATTRS = new Set(["checked", "disabled", "hidden", "selected", "readonly", "required", "autofocus", "open", "multiple", "muted", "itemscope", "noshade", "compact"]);
var VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
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

var effectStack = [];
var batchDepth = 0;
var batchQueue = [];
var isFlushing = false;
var globalStates = [];
var globalEffects = [];
function state(initial) {
  const subscribers = new Set();
  let currentValue = initial;
  const stateObj = {
    get value() {
      if (effectStack.length > 0) {
        const currentEffect = effectStack[effectStack.length - 1];
        subscribers.add(currentEffect);
        currentEffect.dependencies.push(stateObj);
      }
      return currentValue;
    },
    set value(newValue) {
      if (currentValue === newValue) return;
      currentValue = newValue;
      markSubscribersDirty(subscribers);
    },
    dispose() {
      subscribers.clear();
      globalStates = globalStates.filter((s) => s !== stateObj);
    }
  };
  globalStates.push(stateObj);
  return stateObj;
}
function derived(fn) {
  const baseState = state(void 0);
  const dependencies = new Set();
  let dirty = true;
  const evaluate = () => {
    if (!dirty) return;
    const prevEffectStack = effectStack;
    effectStack = [];
    try {
      const result = fn();
      baseState.value = result;
      dependencies.clear();
      effectStack.forEach((effect2) => {
        dependencies.add(effect2);
      });
      dirty = false;
    } finally {
      effectStack = prevEffectStack;
    }
  };
  evaluate();
  const derivedObj = {
    ...baseState,
    dependencies: Array.from(dependencies),
    get value() {
      evaluate();
      return baseState.value;
    }
  };
  return derivedObj;
}
function effect(fn) {
  const effectObj = {
    fn,
    dependencies: []
  };
  globalEffects.push(effectObj);
  const cleanup = () => {
    effectObj.dependencies.forEach((dep) => {
      dep.dispose();
    });
    effectObj.dependencies = [];
    globalEffects = globalEffects.filter((e) => e !== effectObj);
  };
  const wrappedFn = () => {
    effectStack.push(effectObj);
    try {
      fn();
    } finally {
      effectStack.pop();
    }
  };
  wrappedFn();
  return cleanup;
}
function markSubscribersDirty(subscribers) {
  subscribers.forEach((effect2) => {
    if (!effect2.dirty) {
      effect2.dirty = true;
      batchQueue.push(() => {
        if (effect2.dirty) {
          effect2.fn();
          effect2.dirty = false;
        }
      });
    }
  });
  if (batchDepth === 0) {
    queueMicrotask(() => {
      if (batchDepth === 0) {
        flush();
      }
    });
  }
}
function flush() {
  if (isFlushing) return;
  isFlushing = true;
  while (batchQueue.length > 0) {
    const task = batchQueue.shift();
    if (task) {
      task();
    }
  }
  isFlushing = false;
}

function createComponent(options) {
  const { name, template, script, container = document.body } = options;
  const cdo = parseTemplate2(name, template, script);
  const state2 = {};
  const derivedStates = {};
  const effects = [];
  const context = createRenderContext(state2, cdo.slots);
  const root = renderSkeleton(cdo, container);
  context.nodeCache = buildNodeCache(root, cdo.nodes);
  return {
    name,
    state: state2,
    derivedStates,
    effects,
    context,
    cdo,
    container,
    root
  };
}
function mountComponent(instance) {
  fillSlots(instance.cdo, instance.context);
  if (instance.cdo.scriptFactory) {
    const scriptResult = instance.cdo.scriptFactory();
    if (typeof scriptResult === "function") {
      const setupFn = scriptResult;
      const setup = setupFn();
      if (setup.state) {
        Object.assign(instance.state, setup.state);
      }
      if (setup.derived) {
        for (const [key, fn] of Object.entries(setup.derived)) {
          instance.derivedStates[key] = derived(() => fn(instance.state));
        }
      }
      if (setup.effect) {
        const cleanup = effect(() => {
          updateSlots(instance.cdo, instance.context);
        });
        instance.effects.push(cleanup);
      }
    }
  }
}
function updateComponent(instance) {
  updateSlots(instance.cdo, instance.context);
}
function unmountComponent(instance) {
  instance.effects.forEach((cleanup) => cleanup());
  instance.container.removeChild(instance.root);
}
function parseTemplate2(name, template, script) {
  const { root, nodes, slots } = parseTemplate(name, template);
  const scriptFactory = createScriptFactory(script);
  return {
    name,
    root,
    nodes,
    styleText: "",
    scriptFactory,
    slots
  };
}
function buildNodeCache(root, nodes) {
  const cache = new Map();
  function traverse(element) {
    if (element instanceof HTMLElement && element.dataset.yqNodeId) {
      const nodeId = parseInt(element.dataset.yqNodeId);
      cache.set(nodeId, element);
    }
    for (const child of Array.from(element.children)) {
      traverse(child);
    }
  }
  traverse(root);
  return cache;
}
export {
  createComponent,
  mountComponent,
  unmountComponent,
  updateComponent
};
