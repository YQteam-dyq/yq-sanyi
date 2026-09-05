
global.document = {
  createElement: (tagName) => {
    const element = {
      tagName,
      style: {},
      classList: {
        add: () => {},
        remove: () => {}
      },
      setAttribute: (name, value) => {
        element[name] = value
      },
      getAttribute: (name) => element[name] || null,
      appendChild: (child) => {
        element.children = element.children || []
        element.children.push(child)
      },
      removeChild: (child) => {
        if (element.children) {
          const index = element.children.indexOf(child)
          if (index > -1) {
            element.children.splice(index, 1)
          }
        }
      },
      querySelectorAll: (selector) => {
        return []
      },
      innerHTML: '',
      children: [],
      cloneNode: (deep) => {
        const clone = { ...element }
        if (deep && element.children) {
          clone.children = element.children.map(child => child.cloneNode(deep))
        }
        return clone
      },
      dataset: {},
      append: () => {},
      remove: () => {}
    }
    return element
  },
  createDocumentFragment: () => ({
    appendChild: () => {},
    children: []
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
    innerHTML: ''
  },
  head: {
    appendChild: () => {},
    removeChild: () => {}
  },
  createElementNS: (ns, tagName) => {
    return document.createElement(tagName)
  }
}

global.window = {
  setTimeout: (fn) => setTimeout(fn),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn) => setInterval(fn),
  clearInterval: (id) => clearInterval(id),
  addEventListener: () => {},
  removeEventListener: () => {},
  performance: {
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10
    }
  }
}


global.Element = class Element {
  constructor() {
    this.style = {}
    this.classList = {
      add: () => {},
      remove: () => {}
    }
    this.dataset = {}
  }
}


global.HTMLElement = class HTMLElement extends Element {
  constructor() {
    super()
    this.innerHTML = ''
    this.children = []
  }
}


global.Node = class Node {
  constructor() {
    this.parentNode = null
    this.childNodes = []
  }
}


global.Text = class Text extends Node {
  constructor(text = '') {
    super()
    this.textContent = text
  }
}

console.log('🔍 完整DOM环境已创建')