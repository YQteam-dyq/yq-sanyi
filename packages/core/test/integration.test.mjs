import { test } from 'node:test'
import assert from 'node:assert/strict'
import { define, createComponent, mountComponent, updateComponent, unmountComponent, scoper } from '../dist/core.mjs'

const mockDOM = {
  createElement: (tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      setAttribute: (name, value) => { element.attrs = element.attrs || {}; element.attrs[name] = value },
      getAttribute: (name) => element.attrs ? element.attrs[name] || null : null,
      removeAttribute: (name) => { delete element.attrs[name] },
      appendChild: (child) => {
        element.children = element.children || [];
        if (child.children && child.tagName === undefined) {
          for (const c of child.children) {
            if (c) element.children.push(c);
          }
        } else {
          element.children.push(child);
        }
        child.parentElement = element;
      },
      removeChild: (child) => {
        if (element.children) {
          const idx = element.children.indexOf(child);
          if (idx > -1) element.children.splice(idx, 1);
        }
      },
      cloneNode: (deep) => {
        const clone = mockDOM.createElement(tag.toLowerCase());
        if (deep && element.children) {
          clone.children = element.children.map(c => c.cloneNode ? c.cloneNode(true) : c);
        }
        return clone;
      },
      dataset: {},
      children: [],
      querySelector: (sel) => {
        function findChild(el) {
          if (el.children) {
            for (const child of el.children) {
              if (sel === '[data-yq-scope]' && child.attrs && child.attrs['data-yq-scope']) {
                return child;
              }
              const found = findChild(child);
              if (found) return found;
            }
          }
          return null;
        }
        return findChild(element);
      },
      attrs: {},
      parentElement: null
    };
    return element;
  },
  createDocumentFragment: () => {
    const frag = { children: [], appendChild: (child) => { frag.children.push(child); return child; } };
    return frag;
  },
  querySelectorAll: (selector) => [],
  documentElement: { style: { setProperty: () => {}, removeProperty: () => {} } },
  head: {
    appendChild: (child) => {
      child.remove = () => {};
      return child;
    },
    removeChild: (child) => {}
  }
}

global.document = mockDOM

test('Test 1: Same Name Components Isolation', () => {
  define('test-button', {
    template: '<button class="button">Click me</button>',
    style: '.button { background: blue; color: white; padding: 10px 20px; border: none; border-radius: 5px; }',
    script: null
  })

  const component1 = createComponent({
    name: 'test-button',
    template: '<button class="button">Click me</button>',
    container: mockDOM.createElement('div')
  })

  const component2 = createComponent({
    name: 'test-button', 
    template: '<button class="button">Click me too</button>',
    container: mockDOM.createElement('div')
  })

  mountComponent(component1)
  mountComponent(component2)

  const scope1 = component1.container.querySelector('[data-yq-scope]').getAttribute('data-yq-scope')
  const scope2 = component2.container.querySelector('[data-yq-scope]').getAttribute('data-yq-scope')

  assert.notEqual(scope1, scope2)
})

test('Test 2: Theme Override Functionality', () => {
  scoper.updateTheme({
    'primary-color': '#ff6b6b',
    'secondary-color': '#4ecdc4',
    'background-color': '#f8f9fa'
  })

  const theme = scoper.getThemeVariables()
  assert.equal(theme['primary-color'], '#ff6b6b')
  assert.equal(theme['background-color'], '#f8f9fa')
})

test('Test 3: Style Injection Management', () => {
  const injection1 = scoper.injectStyle('.test { color: red; }', 'test-scope')
  const injection2 = scoper.injectStyle('.test { color: red; }', 'test-scope')

  assert.equal(injection1.id, injection2.id)
  assert.equal(injection1.references, 2)

  scoper.removeStyle(injection1)
  assert.equal(injection1.references, 1)
})

test('Test 4: Shadow DOM Integration', () => {
  const element = mockDOM.createElement('div')
  element.attachShadow = (options) => {
    element.shadowRoot = { mode: options.mode, appendChild: () => {}, querySelectorAll: () => [] };
    return element.shadowRoot;
  };
  const shadowElement = scoper.createScopedElement(element, 'shadow-test', { useShadowDOM: true })

  assert.ok(shadowElement.shadowRoot)
})

test('Test 5: Global Styles Management', () => {
  const globalId1 = scoper.addGlobalStyle('.global { color: global; }', 'global-test')
  const globalId2 = scoper.addGlobalStyle('.global2 { color: global2; }')

  const globalStyles = scoper.getGlobalStyles()
  assert.ok(globalStyles[globalId1] && globalStyles[globalId2])

  scoper.removeGlobalStyle(globalId1)
  const updatedGlobalStyles = scoper.getGlobalStyles()
  assert.ok(!updatedGlobalStyles[globalId1] && updatedGlobalStyles[globalId2])
})

test('Test 6: Component Lifecycle with Styles', () => {
  const styledComponent = createComponent({
    name: 'test-button',
    template: '<button class="button">Click me</button>',
    container: mockDOM.createElement('div')
  })

  mountComponent(styledComponent)

  const styleInjection = scoper.injectStyle('.lifecycle-test { color: lifecycle; }', 'lifecycle-scope')
  assert.ok(styleInjection)

  unmountComponent(styledComponent)
})

test('Test 7: Theme System with Components', () => {
  scoper.resetTheme()
  const defaultTheme = scoper.getThemeVariables()
  assert.equal(defaultTheme['primary-color'], '#3b82f6')
})

test('Test 8: Clear All Global Styles', () => {
  scoper.clearGlobalStyles()
  const clearedStyles = scoper.getGlobalStyles()
  assert.equal(Object.keys(clearedStyles).length, 0)

  delete global.document
})
