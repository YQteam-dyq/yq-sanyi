import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createComponent, mountComponent, updateComponent, unmountComponent, setLifecycleHooks, getComponentTree, getUpdateLogs, getStateSnapshot } from '../dist/core.mjs'

const mockDOM = {
  createElement: (tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      setAttribute: (name, value) => {},
      removeAttribute: (name) => {},
      appendChild: (child) => {
        element.children = element.children || [];
        element.children.push(child);
      },
      removeChild: (child) => {},
      cloneNode: (deep) => ({ ...mockDOM.createElement('div') }),
      querySelectorAll: (selector) => [],
      innerHTML: '',
      dataset: {},
      children: []
    };
    return element;
  },
  querySelectorAll: (selector) => [],
  head: {
    appendChild: (child) => {},
    removeChild: (child) => {}
  },
  documentElement: {
    style: {
      setProperty: (name, value) => {},
      removeProperty: (name) => {}
    }
  }
}

global.document = {
  ...mockDOM,
  createDocumentFragment: () => ({
    appendChild: (child) => {},
    removeChild: (child) => {}
  })
}

let component
let component2

test('Test 1: Component Creation', () => {
  component = createComponent({
    name: 'test-component',
    template: '<div>Hello</div>',
    container: mockDOM.createElement('div')
  })

  assert.equal(component.lifecycleState, 'created')
  assert.equal(component.children.length, 0)
})

test('Test 2: Mount Component', () => {
  let mountCalled = false
  setLifecycleHooks(component, {
    onMount: () => {
      mountCalled = true
    }
  })

  mountComponent(component)

  assert.equal(component.lifecycleState, 'mounted')
  assert.equal(mountCalled, true)
})

test('Test 3: Update Component', () => {
  let updateCalled = false
  setLifecycleHooks(component, {
    onUpdate: () => {
      updateCalled = true
    }
  })

  updateComponent(component)

  assert.equal(component.lifecycleState, 'updated')
  assert.equal(updateCalled, true)
})

test('Test 4: Unmount Component', () => {
  let unmountCalled = false
  setLifecycleHooks(component, {
    onUnmount: () => {
      unmountCalled = true
    }
  })

  unmountComponent(component)

  assert.equal(component.lifecycleState, 'unmounted')
  assert.equal(unmountCalled, true)
})

test('Test 5: Update Logs', () => {
  const logs = getUpdateLogs(component)
  assert.ok(logs && logs.length > 0)
})

test('Test 6: State Snapshot', () => {
  const snapshot = getStateSnapshot(component)
  assert.ok(snapshot && snapshot.lifecycleState)
})

test('Test 7: Component Tree', () => {
  const tree = getComponentTree(component)
  assert.ok(tree)
  assert.equal(tree.name, 'test-component')
})

test('Test 8: Double Mount Prevention', () => {
  component2 = createComponent({
    name: 'test-component-2',
    template: '<div>Test</div>',
    container: mockDOM.createElement('div')
  })

  mountComponent(component2)
  mountComponent(component2)

  assert.equal(component2.updateLogs.filter((log) => log.path === 'mount').length, 1)

  delete global.document
})
