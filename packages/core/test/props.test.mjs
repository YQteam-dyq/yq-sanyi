import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define } from '../dist/core.mjs'
import { installGlobals, flush, mount } from './helpers/dom-mock.mjs'

installGlobals()

define('x-prop-kid', {
  name: 'x-prop-kid',
  template: '<p>{{ label }}:{{ count }}</p>',
  style: '',
  script: function () {
    return { state: { label: 'default', count: 0 } }
  }
})

test('static attributes are passed as props at mount', () => {
  define('x-prop-static', {
    name: 'x-prop-static',
    template: '<div><x-prop-kid label="hello" count="7"></x-prop-kid></div>',
    style: '',
    script: null
  })
  const host = mount('x-prop-static')
  const kid = host._yqInstance.root.children[0]
  const inst = kid._yqInstance
  assert.equal(inst.props.label, 'hello')
  assert.equal(inst.props.count, '7')
  host.disconnectedCallback()
})

test('bound attributes flow into the child and update reactively', async () => {
  define('x-prop-bound', {
    name: 'x-prop-bound',
    template: '<div><x-prop-kid label="{{ title }}"></x-prop-kid></div>',
    style: '',
    script: function () {
      return { state: { title: 'first' } }
    }
  })
  const host = mount('x-prop-bound')
  const kid = host._yqInstance.root.children[0]
  const inst = kid._yqInstance
  await flush()
  await flush()
  assert.equal(inst.props.label, 'first')
  assert.equal(kid.children[0].textContent.includes('first'), true)
  host._yqInstance.state.title = 'second'
  await flush()
  await flush()
  assert.equal(inst.props.label, 'second')
  assert.equal(kid.children[0].textContent.includes('second'), true)
  host.disconnectedCallback()
})

test('props shadow child state without mutating it', async () => {
  define('x-prop-shadow', {
    name: 'x-prop-shadow',
    template: '<div><x-prop-kid label="{{ title }}"></x-prop-kid></div>',
    style: '',
    script: function () {
      return { state: { title: 'from-parent' } }
    }
  })
  const host = mount('x-prop-shadow')
  const kid = host._yqInstance.root.children[0]
  const inst = kid._yqInstance
  await flush()
  await flush()
  assert.equal(inst.context.state.label, 'from-parent')
  assert.equal(inst.state.label, 'default')
  inst.props.label = undefined
  assert.equal(inst.context.state.label, 'default')
  host.disconnectedCallback()
})

test('props of numeric binding keep their type', async () => {
  define('x-prop-num', {
    name: 'x-prop-num',
    template: '<div><x-prop-kid count="{{ total }}"></x-prop-kid></div>',
    style: '',
    script: function () {
      return { state: { total: 42 } }
    }
  })
  const host = mount('x-prop-num')
  const kid = host._yqInstance.root.children[0]
  const inst = kid._yqInstance
  await flush()
  await flush()
  assert.equal(inst.props.count, 42)
  assert.equal(typeof inst.props.count, 'number')
  host.disconnectedCallback()
})
