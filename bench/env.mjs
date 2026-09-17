import { performance } from 'node:perf_hooks'

const FRAME_MS = 16

function toCamelCase(name) {
  return name.replace(/-([a-z])/g, function (match, letter) {
    return letter.toUpperCase()
  })
}

function createElement(tag) {
  const element = {
    tagName: String(tag).toUpperCase(),
    attrs: {},
    dataset: {},
    style: { setProperty() {}, removeProperty() {}, cssText: '' },
    classList: { add() {}, remove() {}, contains() { return false } },
    children: [],
    listeners: {},
    textContent: '',
    isConnected: false,
    parentElement: null,
    setAttribute(name, value) {
      element.attrs[name] = String(value)
      if (name.startsWith('data-')) {
        element.dataset[toCamelCase(name.slice(5))] = String(value)
      }
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(element.attrs, name) ? element.attrs[name] : null
    },
    removeAttribute(name) {
      delete element.attrs[name]
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(element.attrs, name)
    },
    appendChild(child) {
      if (child && Array.isArray(child.children) && child.tagName === undefined) {
        for (const item of child.children.slice()) {
          element.appendChild(item)
        }
        return child
      }
      element.children.push(child)
      child.parentElement = element
      return child
    },
    insertBefore(node, anchor) {
      const index = element.children.indexOf(anchor)
      if (index === -1) {
        return element.appendChild(node)
      }
      element.children.splice(index, 0, node)
      node.parentElement = element
      return node
    },
    removeChild(child) {
      const index = element.children.indexOf(child)
      if (index > -1) {
        element.children.splice(index, 1)
        child.parentElement = null
      }
      return child
    },
    remove() {
      if (element.parentElement) {
        element.parentElement.removeChild(element)
      }
    },
    cloneNode(deep) {
      const clone = createElement(tag)
      clone.attrs = { ...element.attrs }
      clone.dataset = { ...element.dataset }
      clone.textContent = element.textContent
      clone.innerHTML = element.innerHTML
      if (deep) {
        clone.children = element.children.map(function (child) {
          return child && typeof child.cloneNode === 'function' ? child.cloneNode(true) : child
        })
        for (const child of clone.children) {
          child.parentElement = clone
        }
      }
      return clone
    },
    addEventListener(type, listener) {
      element.listeners[type] = element.listeners[type] || []
      element.listeners[type].push(listener)
    },
    removeEventListener(type, listener) {
      const list = element.listeners[type] || []
      const index = list.indexOf(listener)
      if (index > -1) {
        list.splice(index, 1)
      }
    },
    dispatch(type, detail) {
      const list = (element.listeners[type] || []).slice()
      for (const listener of list) {
        listener({ type: type, target: element, detail: detail, preventDefault() {}, stopPropagation() {} })
      }
    },
    dispatchEvent(event) {
      element.dispatch(event.type, event.detail)
      return true
    },
    querySelector() {
      return null
    },
    querySelectorAll() {
      return []
    }
  }
  let html = ''
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return html
    },
    set(value) {
      html = value
      if (value === '') {
        for (const child of element.children.slice()) {
          child.parentElement = null
        }
        element.children = []
      }
    },
    configurable: true
  })
  return element
}

function createDocumentFragment() {
  const fragment = {
    children: [],
    appendChild(child) {
      fragment.children.push(child)
      return child
    }
  }
  return fragment
}

function now() {
  return performance.now()
}

function nextFrame() {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(performance.now())
    }, FRAME_MS)
  })
}

function installEnv() {
  const registry = new Map()
  const document = {
    createElement(tag) {
      const element = createElement(tag)
      const constructor = registry.get(String(tag).toLowerCase())
      if (constructor) {
        element.connectedCallback = constructor.prototype.connectedCallback
        element.disconnectedCallback = constructor.prototype.disconnectedCallback
        element._yqInstance = null
        element._yqMounted = false
      }
      return element
    },
    createElementNS(namespace, tag) {
      return document.createElement(tag)
    },
    createTextNode(text) {
      return { textContent: String(text), children: [], parentElement: null }
    },
    createDocumentFragment,
    head: createElement('head'),
    body: createElement('body'),
    documentElement: { style: { setProperty() {}, removeProperty() {} } },
    querySelector() {
      return null
    },
    querySelectorAll() {
      return []
    },
    addEventListener() {},
    removeEventListener() {}
  }
  const window = {
    document,
    performance: { now },
    requestAnimationFrame: nextFrame,
    cancelAnimationFrame(handle) {
      clearTimeout(handle)
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    addEventListener() {},
    removeEventListener() {},
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    scrollY: 0
  }
  class HTMLElement {
    constructor() {
      Object.assign(this, createElement('div'))
    }
  }
  globalThis.document = document
  globalThis.window = window
  globalThis.HTMLElement = HTMLElement
  globalThis.Element = HTMLElement
  globalThis.Node = class Node {}
  globalThis.Text = class Text {
    constructor(text) {
      this.textContent = String(text === undefined ? '' : text)
    }
  }
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init) {
      this.type = type
      this.detail = init ? init.detail : undefined
      this.bubbles = Boolean(init && init.bubbles)
    }
  }
  globalThis.customElements = {
    define(name, constructor) {
      registry.set(name, constructor)
    },
    get(name) {
      return registry.get(name)
    }
  }
  globalThis.requestAnimationFrame = nextFrame
  globalThis.cancelAnimationFrame = window.cancelAnimationFrame
  return { registry, document, window }
}

function mountHost(tag) {
  const host = globalThis.document.createElement(tag)
  host.isConnected = true
  if (typeof host.connectedCallback === 'function') {
    host.connectedCallback()
  }
  return host
}

export { installEnv, mountHost, nextFrame, now, FRAME_MS }
