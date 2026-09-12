import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define, lookup } from '../dist/core.mjs'

let activeRegistry = new Map()

function makeElement(tag) {
  const element = {
    tagName: String(tag).toUpperCase(),
    dataset: {},
    attrs: {},
    children: [],
    listeners: {},
    textContent: '',
    parentElement: null,
    isConnected: false,
    _html: '',
    setAttribute(name, value) {
      element.attrs[name] = String(value)
      if (name.startsWith('data-')) element.dataset[name.slice(5)] = String(value)
    },
    getAttribute(name) {
      return name in element.attrs ? element.attrs[name] : null
    },
    removeAttribute(name) {
      delete element.attrs[name]
      if (name.startsWith('data-')) delete element.dataset[name.slice(5)]
    },
    appendChild(child) {
      if (child && child.children && child.tagName === undefined) {
        for (const c of child.children.slice()) {
          if (c) element.appendChild(c)
        }
        return child
      }
      element.children.push(child)
      child.parentElement = element
      if (element.isConnected) connectNode(child)
      return child
    },
    removeChild(child) {
      const idx = element.children.indexOf(child)
      if (idx > -1) {
        element.children.splice(idx, 1)
        child.parentElement = null
        disconnectNode(child)
      }
    },
    remove() {
      if (element.parentElement) element.parentElement.removeChild(element)
    },
    cloneNode(deep) {
      const clone = createElementLike(tag)
      clone.attrs = { ...element.attrs }
      clone.dataset = { ...element.dataset }
      clone.textContent = element.textContent
      clone._html = element._html
      if (deep) {
        clone.children = (element.children || []).map((c) => (c && c.cloneNode ? c.cloneNode(true) : c))
        for (const c of clone.children) c.parentElement = clone
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
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return element._html
    },
    set(value) {
      element._html = value
      if (value === '') {
        for (const c of element.children.slice()) {
          c.parentElement = null
          disconnectNode(c)
        }
        element.children = []
      }
    },
    configurable: true
  })
  return element
}

function createElementLike(tag) {
  const raw = makeElement(tag)
  const cls = activeRegistry.get(String(tag).toLowerCase())
  if (!cls) return raw
  const proto = cls.prototype
  raw.connectedCallback = proto.connectedCallback
  raw.disconnectedCallback = proto.disconnectedCallback
  raw._yqInstance = null
  raw._yqMounted = false
  raw.isConnected = false
  return raw
}

function connectNode(element) {
  element.isConnected = true
  if (typeof element.connectedCallback === 'function' && !element._yqMounted && !element._yqInstance) {
    element.connectedCallback()
  }
  for (const child of (element.children || []).slice()) {
    connectNode(child)
  }
}

function disconnectNode(element) {
  element.isConnected = false
  for (const child of (element.children || []).slice()) {
    disconnectNode(child)
  }
  if (typeof element.disconnectedCallback === 'function' && element._yqInstance) {
    element.disconnectedCallback()
  }
}

function installGlobals() {
  const registry = new Map()
  activeRegistry = registry
  global.customElements = {
    get: (name) => registry.get(name) || undefined,
    define: (name, cls) => {
      registry.set(name, cls)
    }
  }
  global.HTMLElement = class HTMLElement {
    constructor() {
      Object.assign(this, makeElement('div'))
      this.isConnected = false
    }
  }
  const head = makeElement('head')
  global.document = {
    createElement: (tag) => createElementLike(tag),
    createDocumentFragment: () => ({
      children: [],
      appendChild(child) {
        this.children.push(child)
      }
    }),
    head,
    body: makeElement('body'),
    documentElement: { style: { setProperty() {}, removeProperty() {} } },
    querySelectorAll(selector) {
      const match = /^(\w+)\[([\w-]+)="([^"]*)"\]$/.exec(selector)
      const out = []
      const collect = (els) => {
        for (const el of els || []) {
          if (match && el.tagName === match[1].toUpperCase() && el.getAttribute(match[2]) === match[3]) {
            out.push(el)
          }
          collect(el.children || [])
        }
      }
      collect([head, global.document.body])
      return out
    }
  }
  return registry
}

function flush() {
  return Promise.resolve().then(() => undefined)
}

test('CE state writes inside one event are batched into a single refresh', async () => {
  installGlobals()
  define('x-batch', {
    name: 'x-batch',
    template: '<div><b>{{ count }}</b><button yq-on:click="bump">go</button></div>',
    style: '',
    script: function () {
      return {
        state: { count: 0 },
        bump: function (state) {
          state.count = state.count + 1
          state.count = state.count + 1
        }
      }
    }
  })
  const host = createElementLike('x-batch')
  host.isConnected = true
  host.connectedCallback()
  const instance = host._yqInstance
  const root = instance.root
  const label = root.children[0]
  const button = root.children[1]
  const updateCount = () => instance.updateLogs.filter((log) => log.path === 'update').length
  const baseline = updateCount()
  assert.equal(label.textContent, '0')
  button.dispatch('click')
  await flush()
  assert.equal(label.textContent, '2')
  assert.equal(updateCount(), baseline + 1)
  host.disconnectedCallback()
})

test('keyed list re-renders on add and remove reusing stable rows', async () => {
  installGlobals()
  define('x-list', {
    name: 'x-list',
    template: '<div><button yq-on:click="add">add</button><button yq-on:click="removeLast">rm</button><div yq-for="item in items" yq-key="id"><span>{{ item.label }}</span></div></div>',
    style: '',
    script: function () {
      return {
        state: {
          items: [
            { id: 1, label: 'one' },
            { id: 2, label: 'two' }
          ]
        },
        add: function (state) {
          state.items.push({ id: state.items.length + 1, label: 'new-' + (state.items.length + 1) })
        },
        removeLast: function (state) {
          state.items.pop()
        }
      }
    }
  })
  const host = createElementLike('x-list')
  host.isConnected = true
  host.connectedCallback()
  const instance = host._yqInstance
  const root = instance.root
  const addButton = root.children[0]
  const rmButton = root.children[1]
  const listDiv = root.children[2]
  const rowKeys = () => listDiv.children.map((row) => row.dataset.yqKey)
  const rowLabels = () => listDiv.children.map((row) => row.children[0].textContent)
  assert.deepEqual(rowKeys(), ['1', '2'])
  const firstRow = listDiv.children[0]
  addButton.dispatch('click')
  await flush()
  assert.deepEqual(rowKeys(), ['1', '2', '3'])
  assert.deepEqual(rowLabels(), ['one', 'two', 'new-3'])
  assert.equal(listDiv.children[0], firstRow)
  addButton.dispatch('click')
  await flush()
  assert.deepEqual(rowKeys(), ['1', '2', '3', '4'])
  rmButton.dispatch('click')
  await flush()
  assert.deepEqual(rowKeys(), ['1', '2', '3'])
  assert.deepEqual(rowLabels(), ['one', 'two', 'new-3'])
  host.disconnectedCallback()
})

test('nested custom elements mount inside a component and clean up on removal', async () => {
  installGlobals()
  define('x-inner', {
    name: 'x-inner',
    template: '<button yq-on:click="inc">n{{ count }}</button>',
    style: '',
    script: function () {
      return {
        state: { count: 0 },
        inc: function (state) {
          state.count = state.count + 1
        }
      }
    }
  })
  define('x-outer', {
    name: 'x-outer',
    template: '<div><x-inner></x-inner><b>{{ label }}</b></div>',
    style: '',
    script: function () {
      return {
        state: { label: 'L' }
      }
    }
  })
  const outerHost = createElementLike('x-outer')
  outerHost.isConnected = true
  outerHost.connectedCallback()
  const outer = outerHost._yqInstance
  const outerRoot = outer.root
  const innerEl = outerRoot.children[0]
  const label = outerRoot.children[1]
  assert.equal(innerEl.tagName, 'X-INNER')
  const inner = innerEl._yqInstance
  assert.ok(inner)
  const innerButton = inner.root
  assert.equal(innerButton.textContent, 'n0')
  innerButton.dispatch('click')
  await flush()
  assert.equal(innerButton.textContent, 'n1')
  assert.equal(label.textContent, 'L')
  outer.state.label = 'X'
  await flush()
  assert.equal(label.textContent, 'X')
  assert.equal(innerButton.textContent, 'n1')
  outerHost.disconnectedCallback()
  assert.equal(innerEl._yqInstance, null)
  const innerListeners = innerButton.listeners.click || []
  assert.equal(innerListeners.length, 0)
  assert.equal(outer.lifecycleState, 'unmounted')
})

test('same component style is injected once and released on last unmount', () => {
  installGlobals()
  define('x-panel', {
    name: 'x-panel',
    template: '<div class="panel">{{ t }}</div>',
    style: '.panel { border: 1px solid #333; }',
    script: function () {
      return {
        state: { t: 'hi' }
      }
    }
  })
  const entry = lookup('x-panel')
  const scopeId = entry.cdo.scopeId
  const scopedStyleCount = () =>
    document.head.children.filter((el) => el.tagName === 'STYLE' && el.getAttribute('data-yq-scope-id') === scopeId).length
  const hostA = createElementLike('x-panel')
  hostA.isConnected = true
  hostA.connectedCallback()
  const hostB = createElementLike('x-panel')
  hostB.isConnected = true
  hostB.connectedCallback()
  assert.equal(scopedStyleCount(), 1)
  hostA.disconnectedCallback()
  assert.equal(scopedStyleCount(), 1)
  hostB.disconnectedCallback()
  assert.equal(scopedStyleCount(), 0)
})

test('row event bindings run handlers in the row scope and reuse rows', async () => {
  installGlobals()
  define('x-row-drop', {
    name: 'x-row-drop',
    template: '<div><span>{{ total }}</span><div yq-for="(item, i) in items" yq-key="id"><button yq-on:click="drop">{{ i }}:{{ item.label }}</button></div></div>',
    style: '',
    script: function () {
      return {
        state: {
          items: [
            { id: 1, label: 'first' },
            { id: 2, label: 'second' },
            { id: 3, label: 'third' }
          ],
          total: 3
        },
        drop: function (state) {
          state.items.splice(state.i, 1)
          state.total = state.items.length
        }
      }
    }
  })
  const host = createElementLike('x-row-drop')
  host.isConnected = true
  host.connectedCallback()
  const instance = host._yqInstance
  const total = instance.root.children[0]
  const list = instance.root.children[1]
  const rowLabels = () => list.children.map((row) => row.children[0].textContent)
  assert.equal(total.textContent, '3')
  assert.deepEqual(rowLabels(), ['0:first', '1:second', '2:third'])
  const firstRow = list.children[0]
  const firstButton = firstRow.children[0]
  const secondRow = list.children[1]
  assert.equal(firstButton.listeners.click.length, 1)
  firstButton.dispatch('click')
  await flush()
  assert.equal(total.textContent, '2')
  assert.deepEqual(rowLabels(), ['0:second', '1:third'])
  assert.equal(list.children.length, 2)
  assert.equal(list.children[0], secondRow)
  assert.equal(firstButton.listeners.click.length, 0)
  assert.equal(list.children[0].children[0].listeners.click.length, 1)
  list.children[0].children[0].dispatch('click')
  await flush()
  assert.deepEqual(rowLabels(), ['0:third'])
  assert.equal(total.textContent, '1')
  host.disconnectedCallback()
})

test('row event listeners are released when rows and the host are removed', async () => {
  installGlobals()
  define('x-row-hold', {
    name: 'x-row-hold',
    template: '<div><div yq-for="(item, i) in items" yq-key="id"><button yq-on:click="noop">{{ item.label }}</button></div></div>',
    style: '',
    script: function () {
      return {
        state: { items: [{ id: 1, label: 'a' }, { id: 2, label: 'b' }] },
        noop: function () {}
      }
    }
  })
  const host = createElementLike('x-row-hold')
  host.isConnected = true
  host.connectedCallback()
  const instance = host._yqInstance
  const list = instance.root.children[0]
  const keptRow = list.children[0]
  const droppedRow = list.children[1]
  const droppedButton = droppedRow.children[0]
  assert.equal(droppedButton.listeners.click.length, 1)
  instance.state.items.pop()
  await flush()
  assert.equal(list.children.length, 1)
  assert.equal(list.children[0], keptRow)
  assert.equal(droppedButton.listeners.click.length, 0)
  const keptButton = keptRow.children[0]
  assert.equal(keptButton.listeners.click.length, 1)
  host.disconnectedCallback()
  assert.equal(keptButton.listeners.click.length, 0)
})

test('row handlers are called with the host as this and the native event', async () => {
  installGlobals()
  const seen = { self: null, type: null, label: null, index: null }
  define('x-row-scope', {
    name: 'x-row-scope',
    template: '<div><div yq-for="(item, i) in items" yq-key="id"><button yq-on:click="pick">{{ item.label }}</button></div></div>',
    style: '',
    script: function () {
      return {
        state: { items: [{ id: 1, label: 'one' }], picked: '' },
        pick: function (state, event) {
          seen.self = this
          seen.type = event.type
          seen.label = state.item.label
          seen.index = state.i
          state.picked = state.item.label
        }
      }
    }
  })
  const host = createElementLike('x-row-scope')
  host.isConnected = true
  host.connectedCallback()
  const instance = host._yqInstance
  const button = instance.root.children[0].children[0].children[0]
  button.dispatch('click')
  await flush()
  assert.equal(seen.self, host)
  assert.equal(seen.type, 'click')
  assert.equal(seen.label, 'one')
  assert.equal(seen.index, 0)
  assert.equal(instance.state.picked, 'one')
  host.disconnectedCallback()
})

test('row state writes to the component scope trigger a single refresh', async () => {
  installGlobals()
  define('x-row-write', {
    name: 'x-row-write',
    template: '<div><div yq-for="item in items" yq-key="id"><button yq-on:click="toggle">{{ item.label }}{{ suffix }}</button></div></div>',
    style: '',
    script: function () {
      return {
        state: { items: [{ id: 1, label: 'a' }], suffix: '!' },
        toggle: function (state) {
          state.suffix = '?'
          state.item.label = 'b'
        }
      }
    }
  })
  const host = createElementLike('x-row-write')
  host.isConnected = true
  host.connectedCallback()
  const instance = host._yqInstance
  const updateCount = () => instance.updateLogs.filter((log) => log.path === 'update').length
  const baseline = updateCount()
  const button = instance.root.children[0].children[0].children[0]
  assert.equal(button.textContent, 'a!')
  button.dispatch('click')
  await flush()
  assert.equal(button.textContent, 'b?')
  assert.equal(updateCount(), baseline + 1)
  host.disconnectedCallback()
})

test('rows sharing a yq-key release their listeners when the duplicate is dropped', async () => {
  installGlobals()
  define('x-dup-keys', {
    name: 'x-dup-keys',
    template: '<div><span>{{ hits }}</span><button yq-on:click="keep">keep</button><div yq-for="item in items" yq-key="id"><button yq-on:click="bump">go</button><span>{{ item.label }}</span></div></div>',
    style: '',
    script: function () {
      return {
        state: {
          hits: 0,
          items: [
            { id: 1, label: 'a' },
            { id: 1, label: 'b' }
          ]
        },
        bump: function (state) {
          state.hits = state.hits + 1
        },
        keep: function (state) {
          state.items = state.items.slice(0, 1)
        }
      }
    }
  })
  const host = createElementLike('x-dup-keys')
  host.isConnected = true
  host.connectedCallback()
  const instance = host._yqInstance
  const root = instance.root
  const hits = root.children[0]
  const keepButton = root.children[1]
  const rows = root.children[2]
  assert.equal(rows.children.length, 2)
  const survivingRow = rows.children[0]
  const duplicateRow = rows.children[1]
  duplicateRow.children[0].dispatch('click')
  await flush()
  assert.equal(hits.textContent, '1')
  keepButton.dispatch('click')
  await flush()
  assert.equal(rows.children.length, 1)
  const droppedRow = rows.children[0] === survivingRow ? duplicateRow : survivingRow
  assert.equal(droppedRow.parentElement, null)
  assert.equal(droppedRow.children[0].listeners.click.length, 0)
  assert.equal(droppedRow._yqRowEventCleanups.length, 0)
  droppedRow.children[0].dispatch('click')
  await flush()
  assert.equal(hits.textContent, '1')
  rows.children[0].children[0].dispatch('click')
  await flush()
  assert.equal(hits.textContent, '2')
  host.disconnectedCallback()
})
