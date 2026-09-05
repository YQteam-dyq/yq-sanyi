
import { scoper } from '../dist/core.mjs'


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

console.log('=== CSS Variable Theme System Tests ===')


console.log('\nTest 1: Update theme variables')

const customTheme = {
  'primary-color': '#ff6b6b',
  'secondary-color': '#4ecdc4',
  'background-color': '#f8f9fa'
}

scoper.updateTheme(customTheme)
console.log('✓ Theme variables updated')


console.log('\nTest 2: Get current theme variables')

const currentTheme = scoper.getThemeVariables()
console.log('✓ Current theme:', currentTheme)
console.log('✓ Primary color:', currentTheme['primary-color'])


console.log('\nTest 3: Reset to default theme')

scoper.resetTheme()
const defaultTheme = scoper.getThemeVariables()
console.log('✓ Default theme restored')
console.log('✓ Default primary color:', defaultTheme['primary-color'])


console.log('\nTest 4: Partial theme update')

const partialTheme = {
  'primary-color': '#45b7d1',
  'text-color': '#2d3436'
}

scoper.updateTheme(partialTheme)
const updatedTheme = scoper.getThemeVariables()
console.log('✓ Partial theme applied')
console.log('✓ Updated primary color:', updatedTheme['primary-color'])
console.log('✓ Text color added:', updatedTheme['text-color'])
console.log('✓ Secondary color preserved:', updatedTheme['secondary-color'])


delete global.document

console.log('\n=== CSS Variable Theme System Tests Completed ===')