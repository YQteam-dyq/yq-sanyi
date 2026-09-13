import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define } from '../dist/core.mjs'
import { installGlobals, flush, mount } from './helpers/dom-mock.mjs'

installGlobals()

define('x-dyn-a', {
  name: 'x-dyn-a',
  template: '<i>view A</i>',
  style: '',
  script: null
})

define('x-dyn-b', {
  name: 'x-dyn-b',
  template: '<b>view B</b>',
  style: '',
  script: null
})

test('yq-is renders the named component at mount', () => {
  define('x-dyn-static', {
    name: 'x-dyn-static',
    template: '<div><yq-component yq-is="x-dyn-a"></yq-component></div>',
    style: '',
    script: null
  })
  const host = mount('x-dyn-static')
  const dynHost = host._yqInstance.root.children[0]
  assert.equal(dynHost.children.length, 1)
  assert.equal(dynHost.children[0].tagName, 'I')
  assert.equal(dynHost.children[0].textContent, 'view A')
  host.disconnectedCallback()
})

test('bound yq-is swaps components on state change', async () => {
  define('x-dyn-bound', {
    name: 'x-dyn-bound',
    template: '<div><yq-component yq-is="{{ current }}"></yq-component></div>',
    style: '',
    script: function () {
      return { state: { current: 'x-dyn-a' } }
    }
  })
  const host = mount('x-dyn-bound')
  const dynHost = host._yqInstance.root.children[0]
  assert.equal(dynHost.children[0].tagName, 'I')
  host._yqInstance.state.current = 'x-dyn-b'
  await flush()
  assert.equal(dynHost.children[0].tagName, 'B')
  assert.equal(dynHost.children[0].textContent, 'view B')
  host._yqInstance.state.current = 'x-dyn-a'
  await flush()
  assert.equal(dynHost.children[0].tagName, 'I')
  host.disconnectedCallback()
})

test('empty name clears the dynamic host', async () => {
  define('x-dyn-clear', {
    name: 'x-dyn-clear',
    template: '<div><yq-component yq-is="{{ current }}"></yq-component></div>',
    style: '',
    script: function () {
      return { state: { current: 'x-dyn-a' } }
    }
  })
  const host = mount('x-dyn-clear')
  const dynHost = host._yqInstance.root.children[0]
  assert.equal(dynHost.children.length, 1)
  host._yqInstance.state.current = ''
  await flush()
  assert.equal(dynHost.children.length, 0)
  host.disconnectedCallback()
})

test('unknown component names render nothing without throwing', async () => {
  define('x-dyn-unknown', {
    name: 'x-dyn-unknown',
    template: '<div><yq-component yq-is="{{ current }}"></yq-component></div>',
    style: '',
    script: function () {
      return { state: { current: 'x-not-defined' } }
    }
  })
  const host = mount('x-dyn-unknown')
  const dynHost = host._yqInstance.root.children[0]
  assert.equal(dynHost.children.length, 0)
  host._yqInstance.state.current = 'x-dyn-a'
  await flush()
  assert.equal(dynHost.children[0].tagName, 'I')
  host.disconnectedCallback()
})
