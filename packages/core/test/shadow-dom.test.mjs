
import { scoper } from '../dist/core.mjs'


const mockShadowRoot = {
  mode: 'open',
  appendChild: (element) => {
    console.log('Element added to Shadow DOM')
  },
  querySelectorAll: (selector) => {
    return [
      { setAttribute: (key, value) => console.log(`Set attribute: ${key} = ${value}`) }
    ]
  }
}

const mockElement = {
  attachShadow: (options) => {
    console.log(`Shadow DOM created with mode: ${options.mode}`)
    return mockShadowRoot
  },
  cloneNode: (deep) => {
    return { 
      tagName: 'div', 
      cloneNode: () => ({ tagName: 'div' }),
      setAttribute: (key, value) => {}
    }
  }
}

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
        console.log(`Set CSS variable: ${key} = ${value}`)
      }
    }
  }
}


global.document = mockDocument

console.log('=== Shadow DOM Support Tests ===')


console.log('\nTest 1: Create scoped element without Shadow DOM')

const element1 = {
  cloneNode: (deep) => ({
    tagName: 'div',
    setAttribute: (key, value) => {}
  })
}
const scopedElement1 = scoper.createScopedElement(element1, 'scope-1')
console.log('✓ Regular scoped element created')


console.log('\nTest 2: Create scoped element with Shadow DOM')

const options = {
  scopeId: 'scope-2',
  useShadowDOM: true
}
const scopedElement2 = scoper.createScopedElement(mockElement, 'scope-2', options)
console.log('✓ Shadow DOM scoped element created')


console.log('\nTest 3: Theme variables with Shadow DOM')

const theme = {
  'primary-color': '#ff6b6b',
  'background-color': '#f8f9fa'
}

scoper.updateTheme(theme)
const currentTheme = scoper.getThemeVariables()
console.log('✓ Theme variables applied:', currentTheme)


console.log('\nTest 4: Reset theme')

scoper.resetTheme()
const defaultTheme = scoper.getThemeVariables()
console.log('✓ Theme reset to defaults:', defaultTheme)


delete global.document

console.log('\n=== Shadow DOM Support Tests Completed ===')