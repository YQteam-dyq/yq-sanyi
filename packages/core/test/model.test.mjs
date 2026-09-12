import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define } from '../dist/core.mjs'
import { installGlobals, flush, mount } from './helpers/dom-mock.mjs'

installGlobals()

test('yq-model syncs user input back into state', async () => {
  define('x-model-text', {
    name: 'x-model-text',
    template: '<div><input yq-model="draft"><p>{{ draft }}</p></div>',
    style: '',
    script: function () {
      return { state: { draft: '' } }
    }
  })
  const host = mount('x-model-text')
  const inst = host._yqInstance
  const input = inst.root.children[0]
  input.value = 'typed value'
  input.dispatch('input')
  await flush()
  assert.equal(inst.state.draft, 'typed value')
  assert.equal(inst.root.children[1].textContent, 'typed value')
  host.disconnectedCallback()
})

test('yq-model writes state changes into the element', async () => {
  define('x-model-state', {
    name: 'x-model-state',
    template: '<div><input yq-model="draft"></div>',
    style: '',
    script: function () {
      return { state: { draft: 'initial' } }
    }
  })
  const host = mount('x-model-state')
  const input = host._yqInstance.root.children[0]
  assert.equal(input.value, 'initial')
  host._yqInstance.state.draft = 'updated'
  await flush()
  assert.equal(input.value, 'updated')
  host.disconnectedCallback()
})

test('yq-model.trim strips whitespace', async () => {
  define('x-model-trim', {
    name: 'x-model-trim',
    template: '<div><input yq-model.trim="draft"></div>',
    style: '',
    script: function () {
      return { state: { draft: '' } }
    }
  })
  const host = mount('x-model-trim')
  const input = host._yqInstance.root.children[0]
  input.value = '  padded  '
  input.dispatch('input')
  await flush()
  assert.equal(host._yqInstance.state.draft, 'padded')
  host.disconnectedCallback()
})

test('yq-model.number coerces numeric input', async () => {
  define('x-model-number', {
    name: 'x-model-number',
    template: '<div><input yq-model.number="age" type="number"></div>',
    style: '',
    script: function () {
      return { state: { age: 0 } }
    }
  })
  const host = mount('x-model-number')
  const input = host._yqInstance.root.children[0]
  input.value = '42'
  input.dispatch('input')
  await flush()
  assert.equal(host._yqInstance.state.age, 42)
  assert.equal(typeof host._yqInstance.state.age, 'number')
  input.value = 'abc'
  input.dispatch('input')
  await flush()
  assert.equal(host._yqInstance.state.age, 'abc')
  host.disconnectedCallback()
})

test('checkbox yq-model syncs booleans', async () => {
  define('x-model-check', {
    name: 'x-model-check',
    template: '<div><input type="checkbox" yq-model="agreed"><span>{{ agreed }}</span></div>',
    style: '',
    script: function () {
      return { state: { agreed: false } }
    }
  })
  const host = mount('x-model-check')
  const inst = host._yqInstance
  const box = inst.root.children[0]
  box.checked = true
  box.dispatch('input')
  await flush()
  assert.equal(inst.state.agreed, true)
  assert.equal(inst.root.children[1].textContent, 'true')
  inst.state.agreed = false
  await flush()
  assert.equal(box.checked, false)
  host.disconnectedCallback()
})

test('yq-model.lazy defers sync to the change event', async () => {
  define('x-model-lazy', {
    name: 'x-model-lazy',
    template: '<div><input yq-model.lazy="draft"></div>',
    style: '',
    script: function () {
      return { state: { draft: '' } }
    }
  })
  const host = mount('x-model-lazy')
  const input = host._yqInstance.root.children[0]
  input.value = 'committed'
  input.dispatch('input')
  await flush()
  assert.equal(host._yqInstance.state.draft, '')
  input.dispatch('change')
  await flush()
  assert.equal(host._yqInstance.state.draft, 'committed')
  host.disconnectedCallback()
})
