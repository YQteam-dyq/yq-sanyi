function createRenderContext(state, slots) {
  return {
    state,
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
function resolvePath(state, path) {
  let current = state;
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
export {
  createRenderContext,
  fillSlots,
  renderSkeleton,
  updateSlots
};
