
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scoper } from '../dist/core.mjs'

const cssVariableCalls = []
const mockDocument = {
  createElement: (tagName) => ({
    tagName,
    textContent: '',
    setAttribute: (key, value) => {},
    remove: () => {}
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

const customTheme = {
  'primary-color': '#ff6b6b',
  'secondary-color': '#4ecdc4',
  'background-color': '#f8f9fa'
}

const partialTheme = {
  'primary-color': '#45b7d1',
  'text-color': '#2d3436'
}

test('updateTheme 更新主题变量', () => {
  scoper.updateTheme(customTheme)
  assert.ok(cssVariableCalls.some(([key, value]) => key === '--yq-primary-color' && value === '#ff6b6b'))
  assert.ok(cssVariableCalls.some(([key, value]) => key === '--yq-secondary-color' && value === '#4ecdc4'))
})

test('getThemeVariables 返回当前主题变量', () => {
  const currentTheme = scoper.getThemeVariables()
  assert.strictEqual(currentTheme['primary-color'], '#ff6b6b')
  assert.strictEqual(currentTheme['secondary-color'], '#4ecdc4')
  assert.strictEqual(currentTheme['background-color'], '#f8f9fa')
})

test('resetTheme 恢复默认主题', () => {
  scoper.resetTheme()
  const defaultTheme = scoper.getThemeVariables()
  assert.strictEqual(defaultTheme['primary-color'], '#3b82f6')
  assert.strictEqual(defaultTheme['secondary-color'], '#6b7280')
})

test('updateTheme 部分更新保留其余变量', () => {
  scoper.updateTheme(partialTheme)
  const updatedTheme = scoper.getThemeVariables()
  assert.strictEqual(updatedTheme['primary-color'], '#45b7d1')
  assert.strictEqual(updatedTheme['text-color'], '#2d3436')
  assert.strictEqual(updatedTheme['secondary-color'], '#6b7280')
})
