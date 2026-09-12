import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define } from '../dist/core.mjs'
import { installGlobals, flush, mount } from './helpers/dom-mock.mjs'

installGlobals()

define('x-emit-kid', {
  name: 'x-emit-kid',
  template: '<button yq-on:click="$emit(\'picked\', label)">pick {{ label }}</button>',
  style: '',
  script: function () {
    return { state: { label: 'L1' } }
  }
})

function findTag(el, tag) {
  for (const child of el.children || []) {
    if (child.tagName.toLowerCase() === tag) return child
    const found = findTag(child, tag)
    if (found) return found
  }
  return null
}

test('$emit carries the payload to the parent handler', async () => {
  define('x-emit-parent', {
    name: 'x-emit-parent',
    template: '<div><x-emit-kid yq-on:picked="onPick"></x-emit-kid><output>{{ picked }}</output></div>',
    style: '',
    script: function () {
      return {
        state: { picked: '' },
        onPick: function (state, event) {
          state.picked = event.detail
        }
      }
    }
  })
  const host = mount('x-emit-parent')
  const inst = host._yqInstance
  const button = findTag(inst.root, 'button')
  button.dispatch('click')
  await flush()
  assert.equal(inst.state.picked, 'L1')
  assert.equal(findTag(inst.root, 'output').textContent, 'L1')
  host.disconnectedCallback()
})

test('declarative onMount / onUpdate / onUnmount receive state', async () => {
  const calls = []
  define('x-emit-life', {
    name: 'x-emit-life',
    template: '<div>{{ n }}</div>',
    style: '',
    script: function () {
      return {
        state: { n: 1 },
        onMount: function (state) {
          calls.push('mount:' + state.n)
        },
        onUpdate: function (state) {
          calls.push('update:' + state.n)
        },
        onUnmount: function () {
          calls.push('unmount')
        }
      }
    }
  })
  const host = mount('x-emit-life')
  const inst = host._yqInstance
  inst.state.n = 2
  await flush()
  host.disconnectedCallback()
  assert.deepEqual(calls, ['mount:1', 'update:2', 'unmount'])
})

test('script lifecycle keys are not exposed as event handlers', () => {
  define('x-emit-reserved', {
    name: 'x-emit-reserved',
    template: '<div>ok</div>',
    style: '',
    script: function () {
      return {
        state: {},
        onMount: function () {},
        greet: function () {}
      }
    }
  })
  const host = mount('x-emit-reserved')
  const handlers = host._yqInstance.handlers
  assert.equal(handlers.onMount, undefined)
  assert.equal(typeof handlers.greet, 'function')
  host.disconnectedCallback()
})
