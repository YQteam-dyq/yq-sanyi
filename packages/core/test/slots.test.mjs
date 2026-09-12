import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define } from '../dist/core.mjs'
import { installGlobals, flush, mount } from './helpers/dom-mock.mjs'

installGlobals()

define('x-slot-card', {
  name: 'x-slot-card',
  template: '<div class="card"><header><slot name="title"></slot></header><section><slot></slot></section></div>',
  style: '',
  script: null
})

test('default slot distributes unslotted children', () => {
  define('x-slot-default', {
    name: 'x-slot-default',
    template: '<div><x-slot-card><p>body text</p></x-slot-card></div>',
    style: '',
    script: null
  })
  const host = mount('x-slot-default')
  const cardRoot = host._yqInstance.root.children[0].children[0]
  const section = cardRoot.children[1]
  assert.equal(section.children[0].tagName, 'SLOT')
  assert.equal(section.children[0].children[0].tagName, 'P')
  assert.equal(section.children[0].children[0].textContent, 'body text')
  host.disconnectedCallback()
})

test('named slots distribute children marked with slot attribute', () => {
  define('x-slot-named', {
    name: 'x-slot-named',
    template: '<div><x-slot-card><h2 slot="title">My Title</h2><p>body</p></x-slot-card></div>',
    style: '',
    script: null
  })
  const host = mount('x-slot-named')
  const cardRoot = host._yqInstance.root.children[0].children[0]
  const header = cardRoot.children[0]
  const section = cardRoot.children[1]
  assert.equal(header.children[0].tagName, 'SLOT')
  assert.equal(header.children[0].children[0].tagName, 'H2')
  assert.equal(header.children[0].children[0].textContent, 'My Title')
  assert.equal(section.children[0].children[0].tagName, 'P')
  host.disconnectedCallback()
})

test('multiple children land in the default slot in order', () => {
  define('x-slot-multi', {
    name: 'x-slot-multi',
    template: '<div><x-slot-card><p>one</p><span>two</span></x-slot-card></div>',
    style: '',
    script: null
  })
  const host = mount('x-slot-multi')
  const cardRoot = host._yqInstance.root.children[0].children[0]
  const section = cardRoot.children[1]
  const slotEl = section.children[0]
  assert.equal(slotEl.tagName, 'SLOT')
  assert.equal(slotEl.children.length, 2)
  assert.equal(slotEl.children[0].textContent, 'one')
  assert.equal(slotEl.children[1].textContent, 'two')
  host.disconnectedCallback()
})

test('slot placeholders stay empty when no content is given', () => {
  define('x-slot-empty', {
    name: 'x-slot-empty',
    template: '<div><x-slot-card></x-slot-card></div>',
    style: '',
    script: null
  })
  const host = mount('x-slot-empty')
  const cardRoot = host._yqInstance.root.children[0].children[0]
  assert.equal(cardRoot.children[0].children[0].children.length, 0)
  assert.equal(cardRoot.children[1].children[0].children.length, 0)
  host.disconnectedCallback()
})
