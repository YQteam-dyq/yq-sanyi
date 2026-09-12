import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define, parseTemplate } from '../dist/core.mjs'
import { installGlobals, flush, mount } from './helpers/dom-mock.mjs'

installGlobals()

test('yq-if renders only the truthy branch at mount', () => {
  define('x-if-basic', {
    name: 'x-if-basic',
    template: '<div><p yq-if="visible">A</p><p yq-else>C</p></div>',
    style: '',
    script: function () {
      return { state: { visible: true } }
    }
  })
  const host = mount('x-if-basic')
  const kids = host._yqInstance.root.children
  assert.equal(kids.length, 1)
  assert.equal(kids[0].textContent, 'A')
  host.disconnectedCallback()
})

test('yq-if / yq-else-if / yq-else switches branches on state change', async () => {
  define('x-if-chain', {
    name: 'x-if-chain',
    template: '<div><p yq-if="visible">A</p><p yq-else-if="alt">B</p><p yq-else>C</p></div>',
    style: '',
    script: function () {
      return { state: { visible: true, alt: false } }
    }
  })
  const host = mount('x-if-chain')
  const root = host._yqInstance.root
  const labels = () => root.children.map((el) => el.textContent).join(',')
  assert.equal(labels(), 'A')
  host._yqInstance.state.visible = false
  await flush()
  assert.equal(labels(), 'C')
  host._yqInstance.state.alt = true
  await flush()
  assert.equal(labels(), 'B')
  host._yqInstance.state.visible = true
  await flush()
  assert.equal(labels(), 'A')
  host.disconnectedCallback()
})

test('yq-if restores the element at its anchored position', async () => {
  define('x-if-restore', {
    name: 'x-if-restore',
    template: '<div><b yq-if="flag">B</b><i>static</i></div>',
    style: '',
    script: function () {
      return { state: { flag: true } }
    }
  })
  const host = mount('x-if-restore')
  const root = host._yqInstance.root
  assert.equal(root.children[0].tagName, 'B')
  host._yqInstance.state.flag = false
  await flush()
  assert.equal(root.children.length, 1)
  assert.equal(root.children[0].tagName, 'I')
  host._yqInstance.state.flag = true
  await flush()
  assert.equal(root.children[0].tagName, 'B')
  assert.equal(root.children[1].tagName, 'I')
  host.disconnectedCallback()
})

test('yq-show keeps the element in the DOM and toggles hidden', async () => {
  define('x-show', {
    name: 'x-show',
    template: '<div><span yq-show="visible">S</span></div>',
    style: '',
    script: function () {
      return { state: { visible: true } }
    }
  })
  const host = mount('x-show')
  const span = host._yqInstance.root.children[0]
  assert.equal(span.attrs.hidden, undefined)
  host._yqInstance.state.visible = false
  await flush()
  assert.equal(span.attrs.hidden, '')
  host._yqInstance.state.visible = true
  await flush()
  assert.equal(span.attrs.hidden, undefined)
  host.disconnectedCallback()
})

test('empty arrays are falsy for yq-if', async () => {
  define('x-if-array', {
    name: 'x-if-array',
    template: '<div><p yq-if="items">list</p><p yq-else>empty</p></div>',
    style: '',
    script: function () {
      return { state: { items: [1] } }
    }
  })
  const host = mount('x-if-array')
  const root = host._yqInstance.root
  assert.equal(root.children[0].textContent, 'list')
  host._yqInstance.state.items = []
  await flush()
  assert.equal(root.children[0].textContent, 'empty')
  host.disconnectedCallback()
})

test('yq-if on the root element is a parse error', () => {
  assert.throws(() => {
    parseTemplate('x-if-root', '<p yq-if="flag">nope</p>')
  }, /yq-if/)
})
