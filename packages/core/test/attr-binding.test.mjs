import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createComponent, mountComponent, updateComponent, unmountComponent } from '../dist/core.mjs'

function makeEl(tag) {
  const ds = {}
  const el = {
    tagName: tag.toUpperCase(),
    attrs: {},
    children: [],
    parentElement: null,
    dataset: new Proxy(ds, {
      set(target, key, value) {
        target[key] = value
        el.attrs['data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())] = value
        return true
      },
      deleteProperty(target, key) {
        delete target[key]
        delete el.attrs['data-' + String(key).replace(/[A-Z]/g, c => '-' + c.toLowerCase())]
        return true
      },
      get(target, key) { return target[key] }
    }),
    setAttribute(name, value) {
      el.attrs[name] = value
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
        ds[key] = value
      } else {
        el[name] = value
      }
    },
    getAttribute(name) { return el.attrs[name] != null ? el.attrs[name] : null },
    removeAttribute(name) {
      delete el.attrs[name]
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
        delete ds[key]
      }
      delete el[name]
    },
    appendChild(child) {
      if (child && Array.isArray(child.children) && child.tagName === undefined) {
        for (const c of child.children) {
          el.children.push(c)
          c.parentElement = el
        }
      } else if (child) {
        el.children.push(child)
        child.parentElement = el
      }
    },
    removeChild(child) {
      const i = el.children.indexOf(child)
      if (i > -1) el.children.splice(i, 1)
    },
    cloneNode(deep) {
      const clone = makeEl(tag)
      clone.attrs = { ...el.attrs }
      for (const k of Object.keys(ds)) clone.dataset[k] = ds[k]
      clone.tagName = el.tagName
      if (deep && el.children) {
        for (const c of el.children) {
          const cc = c.cloneNode ? c.cloneNode(true) : c
          clone.children.push(cc)
          cc.parentElement = clone
        }
      }
      return clone
    }
  }
  return el
}

const mockDOM = {
  createElement: (tag) => makeEl(tag),
  createDocumentFragment: () => ({ children: [], appendChild(c) { this.children.push(c); return c } }),
  querySelectorAll: () => [],
  documentElement: { style: { setProperty: () => {}, removeProperty: () => {} } },
  head: { appendChild: () => {}, removeChild: () => {} },
  body: {
    appendChild(c) {
      this.children = this.children || []
      this.children.push(c)
      return c
    },
    removeChild: () => {},
    innerHTML: '',
    children: []
  },
  createElementNS: (ns, tag) => makeEl(tag)
}

global.document = mockDOM
global.window = {
  setTimeout: (fn) => setTimeout(fn),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn) => setInterval(fn),
  clearInterval: (id) => clearInterval(id),
  addEventListener: () => {},
  removeEventListener: () => {},
  performance: { memory: { usedJSHeapSize: 1024 * 1024 * 10 } }
}

function findByTag(root, tag) {
  function walk(el) {
    if (!el) return null
    if (el.tagName === tag.toUpperCase()) return el
    if (el.children) {
      for (const c of el.children) {
        const r = walk(c)
        if (r) return r
      }
    }
    return null
  }
  return walk(root)
}

test('attr binding: input value on mount', () => {
  const inst = createComponent({
    name: 'attr-binding-input',
    template: '<div><input value="{{ v }}"><span title="{{ v }}">{{ v }}</span></div>',
    script: () => ({ state: { v: 'Hi' } })
  })
  mountComponent(inst)
  const input = findByTag(inst.root, 'INPUT')
  const span = findByTag(inst.root, 'SPAN')
  assert.equal(input.attrs.value, 'Hi', 'input.value on mount should be "Hi"')
  assert.equal(span.attrs.title, 'Hi', 'span.title on mount should be "Hi"')
  unmountComponent(inst)
})

test('attr binding: data-* on mount', () => {
  const inst = createComponent({
    name: 'attr-binding-data',
    template: '<ul><li data-id="{{ t.id }}">{{ t.id }}</li></ul>',
    script: () => ({ state: { t: { id: 42 } } })
  })
  mountComponent(inst)
  const li = findByTag(inst.root, 'LI')
  assert.equal(li.attrs['data-id'], '42', 'li data-id on mount should be "42"')
  unmountComponent(inst)
})

test('attr binding: input value updates on state change', () => {
  const inst = createComponent({
    name: 'attr-binding-update',
    template: '<div><input value="{{ v }}"><span title="{{ v }}">{{ v }}</span></div>',
    script: () => ({ state: { v: 'Hi' } })
  })
  mountComponent(inst)
  inst.state.v = 'After'
  updateComponent(inst)
  const input = findByTag(inst.root, 'INPUT')
  const span = findByTag(inst.root, 'SPAN')
  assert.equal(input.attrs.value, 'After', 'input.value after update should be "After"')
  assert.equal(span.attrs.title, 'After', 'span.title after update should be "After"')
  unmountComponent(inst)
})

test('attr binding: boolean attr on mount', () => {
  const inst = createComponent({
    name: 'attr-binding-bool',
    template: '<div><input type="checkbox" disabled="{{ isOn }}">x</div>',
    script: () => ({ state: { isOn: true } })
  })
  mountComponent(inst)
  const input = findByTag(inst.root, 'INPUT')
  assert.ok(input.attrs.disabled === '' || input.attrs.disabled === 'disabled' || input.attrs.disabled === true, 'disabled attr should be set when state true')
  unmountComponent(inst)
})
