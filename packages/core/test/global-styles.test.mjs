import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoper } from '../dist/core.mjs'

const mockDOM = {
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    setAttribute: (name, value) => {},
    removeAttribute: (name) => {},
    appendChild: (child) => {},
    removeChild: (child) => {},
    cloneNode: (deep) => ({ ...mockDOM.createElement('div') })
  }),
  querySelectorAll: (selector) => [],
  head: {
    appendChild: (child) => {},
    removeChild: (child) => {}
  }
}

global.document = mockDOM

let autoStyleId = null

test('addGlobalStyle with explicit id registers the style and returns that id', () => {
  const styleId1 = scoper.addGlobalStyle('.global-button { color: blue; }', 'global-button-style')
  assert.ok(styleId1 && typeof styleId1 === 'string')
  assert.strictEqual(styleId1, 'global-button-style')
})

test('addGlobalStyle without id generates and returns a style id', () => {
  autoStyleId = scoper.addGlobalStyle('.global-container { background: white; }')
  assert.ok(autoStyleId && typeof autoStyleId === 'string')
})

test('getGlobalStyles returns all registered global styles', () => {
  const globalStyles = scoper.getGlobalStyles()
  assert.ok(globalStyles && typeof globalStyles === 'object')
  const keys = Object.keys(globalStyles)
  assert.ok(keys.length >= 2)
  assert.ok(keys.includes('global-button-style'))
  assert.ok(keys.includes(autoStyleId))
})

test('removeGlobalStyle removes only the targeted style', () => {
  scoper.removeGlobalStyle('global-button-style')
  const updatedStyles = scoper.getGlobalStyles()
  assert.ok(!updatedStyles['global-button-style'])
  assert.ok(updatedStyles[autoStyleId])
})

test('clearGlobalStyles empties the style registry', () => {
  scoper.clearGlobalStyles()
  const clearedStyles = scoper.getGlobalStyles()
  assert.strictEqual(Object.keys(clearedStyles).length, 0)
})

test('removeGlobalStyle with a non-existent id does not throw', () => {
  assert.doesNotThrow(() => scoper.removeGlobalStyle('non-existent-style'))
  delete global.document
})
