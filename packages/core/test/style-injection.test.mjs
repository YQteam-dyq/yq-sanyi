import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoper } from '../dist/core.mjs'

const mockStyleElements = []
const mockDocument = {
  createElement: (tagName) => {
    const element = {
      tagName,
      textContent: '',
      setAttribute: (key, value) => {},
      remove: () => {
        const index = mockStyleElements.indexOf(element)
        if (index > -1) {
          mockStyleElements.splice(index, 1)
        }
      }
    }
    return element
  },
  head: {
    appendChild: (element) => {
      mockStyleElements.push(element)
    }
  }
}

global.document = mockDocument

const css1 = '.button { color: red; }'
let injection1
let injection2

test('same css and same scope reuses the injection id and bumps references', () => {
  injection1 = scoper.injectStyle(css1, 'scope-1')
  assert.ok(injection1 && typeof injection1.id === 'string')
  assert.strictEqual(mockStyleElements.length, 1)
  injection2 = scoper.injectStyle(css1, 'scope-1')
  assert.strictEqual(injection2.id, injection1.id)
  assert.strictEqual(injection1.references, 2)
  assert.strictEqual(mockStyleElements.length, 1)
})

test('different css creates a new injection', () => {
  const injection3 = scoper.injectStyle('.container { background: blue; }', 'scope-2')
  assert.notStrictEqual(injection3.id, injection1.id)
  assert.strictEqual(mockStyleElements.length, 2)
})

test('removeStyle decrements the reference count', () => {
  scoper.removeStyle(injection1)
  assert.strictEqual(injection1.references, 1)
  assert.strictEqual(mockStyleElements.length, 2)
})

test('style element is removed when references reach zero', () => {
  scoper.removeStyle(injection1)
  assert.strictEqual(injection1.references, 0)
  assert.ok(!mockStyleElements.includes(injection1.element))
  assert.strictEqual(mockStyleElements.length, 1)
})

test('different scope ids create separate injections', () => {
  const injection4 = scoper.injectStyle(css1, 'scope-3')
  const injection5 = scoper.injectStyle(css1, 'scope-4')
  assert.notStrictEqual(injection4.id, injection5.id)
  delete global.document
})
