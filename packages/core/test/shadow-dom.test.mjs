
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoper } from '../dist/core.mjs'

const scopedAttributeCalls = []
const appendedNodes = []
const mockShadowRoot = {
  mode: 'open',
  appendChild: (element) => {
    appendedNodes.push(element)
  },
  querySelectorAll: (selector) => {
    return [
      {
        setAttribute: (key, value) => {
          scopedAttributeCalls.push([key, value])
        }
      }
    ]
  }
}

const attachShadowCalls = []
const shadowClone = {
  tagName: 'div',
  cloneNode: () => shadowClone,
  setAttribute: (key, value) => {},
  dataset: {}
}
const mockElement = {
  attachShadow: (options) => {
    attachShadowCalls.push(options)
    return mockShadowRoot
  },
  cloneNode: (deep) => shadowClone,
  dataset: {}
}

const scopedElementCalls = []
const element1 = {
  cloneNode: (deep) => ({
    tagName: 'div',
    setAttribute: (key, value) => {
      scopedElementCalls.push([key, value])
    },
    dataset: {}
  }),
  dataset: {}
}

const cssVariableCalls = []
const mockDocument = {
  createElement: (tagName) => ({
    tagName,
    textContent: '',
    setAttribute: (key, value) => {},
    remove: () => {},
    dataset: {}
  }),
  head: {
    appendChild: (element) => {}
  },
  documentElement: {
    style: {
      setProperty: (key, value) => {
        cssVariableCalls.push([key, value])
      }
    }
  }
}

global.document = mockDocument

test('createScopedElement 无 options 返回带 scope 属性的克隆', () => {
  const scopedElement = scoper.createScopedElement(element1, 'scope-1')
  assert.notStrictEqual(scopedElement, element1)
  assert.ok(scopedElement.dataset)
  assert.deepEqual(scopedElementCalls, [['data-yq-scope', 'scope-1']])
})

test('createScopedElement useShadowDOM 创建并填充 Shadow DOM', () => {
  const options = {
    scopeId: 'scope-2',
    useShadowDOM: true
  }
  const scopedElement = scoper.createScopedElement(mockElement, 'scope-2', options)
  assert.strictEqual(scopedElement, mockElement)
  assert.deepEqual(attachShadowCalls, [{ mode: 'open' }])
  assert.strictEqual(appendedNodes.length, 1)
  assert.strictEqual(appendedNodes[0], shadowClone)
  assert.deepEqual(scopedAttributeCalls, [['data-yq-scope', 'scope-2']])
})

test('updateTheme 应用主题变量', () => {
  const theme = {
    'primary-color': '#ff6b6b',
    'background-color': '#f8f9fa'
  }
  scoper.updateTheme(theme)
  const currentTheme = scoper.getThemeVariables()
  assert.strictEqual(currentTheme['primary-color'], '#ff6b6b')
  assert.strictEqual(currentTheme['background-color'], '#f8f9fa')
  assert.ok(cssVariableCalls.some(([key, value]) => key === '--yq-primary-color' && value === '#ff6b6b'))
})

test('resetTheme 恢复默认主题', () => {
  scoper.resetTheme()
  const defaultTheme = scoper.getThemeVariables()
  assert.strictEqual(defaultTheme['primary-color'], '#3b82f6')
  assert.strictEqual(Object.keys(defaultTheme).length, 6)
})
