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
function parseTextParts(text, slots, nodeId) {
  const parts = [];
  const segments = text.split("{{");
  if (segments.length === 1) {
    const trimmed = segments[0].trim();
    if (trimmed.length > 0) {
      parts.push({ static: decodeEntities(trimmed) });
    }
    return parts;
  }
  parts.push({ static: decodeEntities(segments[0]) });
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i];
    const closing = segment.indexOf("}}");
    if (closing === -1) {
      throw new Error("unclosed {{ expression");
    }
    const path = segment.substring(0, closing).trim();
    if (path.length === 0) {
      throw new Error("empty expression in {{ }}");
    }
    const pathSegments = parsePath(path);
    slots.push({ kind: "text", nodeId, partIndex: parts.length });
    parts.push({ path: pathSegments });
    const rest = segment.substring(closing + 2);
    if (rest.length > 0) {
      parts.push({ static: decodeEntities(rest) });
    }
  }
  return parts;
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
    const trimmedContent = content.trim();
    if (trimmedContent.length > 0 && !trimmedContent.startsWith("<")) {
      const textParts = parseTextParts(content, slots, node.id);
      node.text = textParts;
    } else {
      let childContent = content;
      while (childContent.length > 0) {
        const childResult = parseNode(childContent);
        node.children.push(childResult.node);
        childContent = childResult.remaining;
        if (childContent.trim().length === 0) break;
      }
    }
    return { node, remaining: html.substring(afterClose) };
  }
  const trimmed = template.trim();
  if (trimmed.length === 0) error("empty template");
  let remaining = trimmed;
  let rootResult = null;
  while (remaining.length > 0) {
    if (remaining[0] !== "<") {
      const textNode = {
        id: nodeId++,
        tag: "",
        staticAttrs: {},
        dynAttrs: {},
        text: parseTextParts(remaining, slots, nodeId - 1),
        children: [],
        list: null
      };
      nodes.push(textNode);
      rootResult = { node: textNode, remaining: "" };
      break;
    }
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
export {
  createScriptFactory,
  parseTemplate
};
