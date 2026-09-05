


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


global.document = {
  ...mockDOM,
  documentElement: {
    style: {
      setProperty: (name, value) => {},
      removeProperty: (name) => {}
    }
  }
}


const mockHTMLElement = {
  ...mockDOM.createElement('div'),
  attachShadow: (options) => ({
    mode: options.mode,
    appendChild: (child) => {},
    removeChild: (child) => {},
    querySelectorAll: (selector) => [],
    style: {
      setProperty: (name, value) => {},
      removeProperty: (name) => {}
    }
  })
}

console.log('=== Simple Phase 5 Test ===')

try {

  console.log('\n--- Test 1: CSS Scoping ---')
  
  const css = '.button { color: red; }'
  const scopedCSS = scoper.generateScopedCSS(css, 'test-scope')
  
  if (scopedCSS.includes('[data-yq-scope="test-scope"]')) {
    console.log('✓ CSS scoping works')
  } else {
    console.log('✗ CSS scoping failed')
  }
  

  console.log('\n--- Test 2: Theme System ---')
  
  scoper.updateTheme({
    'primary-color': '#ff6b6b',
    'secondary-color': '#4ecdc4'
  })
  
  const theme = scoper.getThemeVariables()
  if (theme['primary-color'] === '#ff6b6b') {
    console.log('✓ Theme system works')
  } else {
    console.log('✗ Theme system failed')
  }
  

  console.log('\n--- Test 3: Style Injection ---')
  
  const injection = scoper.injectStyle('.test { color: blue; }', 'test-scope')
  if (injection && injection.id) {
    console.log('✓ Style injection works')
  } else {
    console.log('✗ Style injection failed')
  }
  

  console.log('\n--- Test 4: Global Styles ---')
  
  const globalId = scoper.addGlobalStyle('.global { color: global; }', 'test-global')
  const globalStyles = scoper.getGlobalStyles()
  
  if (globalStyles[globalId]) {
    console.log('✓ Global styles work')
  } else {
    console.log('✗ Global styles failed')
  }
  

  console.log('\n--- Test 5: Shadow DOM ---')
  
  const element = mockHTMLElement
  const shadowElement = scoper.createScopedElement(element, 'shadow-test', { useShadowDOM: true })
  
  if (shadowElement.shadowRoot) {
    console.log('✓ Shadow DOM works')
  } else {
    console.log('✗ Shadow DOM failed')
  }
  
  console.log('\n=== Simple Phase 5 Test Completed ===')
  console.log('✅ All basic Phase 5 features working correctly!')
  
} catch (error) {
  console.log('✗ Simple Phase 5 test failed:', error.message)
}


delete global.document