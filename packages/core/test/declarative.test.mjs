import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define, lookup, isValidTagName, parseTemplate } from '../dist/core.mjs'

function makeElement(tag) {
  const element = {
    tagName: String(tag).toUpperCase(),
    dataset: {},
    attrs: {},
    children: [],
    listeners: {},
    textContent: '',
    innerHTML: '',
    parentElement: null,
    isConnected: false,
    setAttribute(name, value) {
      element.attrs[name] = String(value)
      element.dataset[name.replace(/^data-/, '')] = String(value)
    },
    getAttribute(name) {
      return name in element.attrs ? element.attrs[name] : null
    },
    removeAttribute(name) {
      delete element.attrs[name]
      delete element.dataset[name.replace(/^data-/, '')]
    },
    appendChild(child) {
      if (child && child.children && child.tagName === undefined) {
        for (const c of child.children) {
          if (c) {
            element.children.push(c)
            c.parentElement = element
          }
        }
        return child
      }
      element.children.push(child)
      child.parentElement = element
      return child
    },
    removeChild(child) {
      const idx = element.children.indexOf(child)
      if (idx > -1) {
        element.children.splice(idx, 1)
        child.parentElement = null
      }
    },
    cloneNode(deep) {
      const clone = makeElement(tag)
      clone.attrs = { ...element.attrs }
      clone.dataset = { ...element.dataset }
      clone.textContent = element.textContent
      clone.innerHTML = element.innerHTML
      if (deep) {
        clone.children = element.children.map((c) => (c && c.cloneNode ? c.cloneNode(true) : c))
      }
      return clone
    },
    addEventListener(event, fn) {
      element.listeners[event] = element.listeners[event] || []
      element.listeners[event].push(fn)
    },
    removeEventListener(event, fn) {
      const list = element.listeners[event]
      if (!list) return
      const idx = list.indexOf(fn)
      if (idx > -1) list.splice(idx, 1)
    },
    dispatch(eventName) {
      const list = element.listeners[eventName] || []
      for (const fn of list.slice()) {
        fn({ type: eventName, target: element })
      }
    }
  }
  return element
}

function installGlobals() {
  const registered = new Map()
  global.customElements = {
    get: (name) => registered.get(name) || undefined,
    define: (name, cls) => {
      registered.set(name, cls)
    }
  }
  global.HTMLElement = class HTMLElement {
    constructor() {
      Object.assign(this, makeElement('div'))
      this.isConnected = false
    }
  }
  const fragment = () => ({ children: [], appendChild(child) { this.children.push(child) } })
  global.document = {
    createElement: (tag) => makeElement(tag),
    createDocumentFragment: fragment,
    head: { appendChild() {}, removeChild() {} },
    body: { appendChild() {}, removeChild() {}, innerHTML: '' },
    documentElement: { style: { setProperty() {}, removeProperty() {} } },
    querySelectorAll: () => []
  }
  return registered
}

test('parseTemplate collects yq-on event slots', () => {
  const { slots } = parseTemplate('demo', '<button yq-on:click="inc">go</button>')
  const eventSlot = slots.find((s) => s.kind === 'event')
  assert.ok(eventSlot)
  assert.deepEqual(eventSlot, { kind: 'event', nodeId: 0, event: 'click', handler: 'inc' })
  const raw = slots.find((s) => s.kind === 'event')
  assert.ok(raw)
})

test('isValidTagName enforces hyphenated lowercase names', () => {
  assert.equal(isValidTagName('yq-counter'), true)
  assert.equal(isValidTagName('x-666'), true)
  assert.equal(isValidTagName('666'), false)
  assert.equal(isValidTagName('counter'), false)
  assert.equal(isValidTagName('Counter-ok'), false)
  assert.equal(isValidTagName(''), false)
})

function flush() {
  return Promise.resolve().then(() => undefined)
}

test('define registers a custom element that auto-mounts and syncs state', async () => {
  const registered = installGlobals()
  const def = {
    name: 'x-counter',
    template: '<button yq-on:click="inc">count {{count}}</button>',
    style: '',
    script: function () {
      return {
        state: { count: 0 },
        inc: (s) => {
          s.count = s.count + 1
        }
      }
    }
  }
  define('x-counter', def)
  const entry = lookup('x-counter')
  assert.ok(entry)
  const YqClass = registered.get('x-counter')
  assert.equal(typeof YqClass, 'function')
  assert.equal(isValidTagName('x-counter'), true)

  const host = makeElement('x-counter')
  host.isConnected = true
  const instance = new YqClass()
  Object.assign(instance, host)
  instance.connectedCallback()

  const button = instance.children[0]
  assert.ok(button)
  assert.equal(button.textContent, 'count 0')

  button.dispatch('click')
  await flush()
  assert.equal(button.textContent, 'count 1')

  button.dispatch('click')
  await flush()
  assert.equal(button.textContent, 'count 2')

  instance.disconnectedCallback()
  const listeners = button.listeners.click || []
  assert.equal(listeners.length, 0)
})
