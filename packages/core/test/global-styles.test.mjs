


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

console.log('=== Global Styles Management Tests ===')

try {

  const styleId1 = scoper.addGlobalStyle('.global-button { color: blue; }', 'global-button-style')
  if (styleId1 && typeof styleId1 === 'string') {
    console.log('✓ Global style added:', styleId1)
  } else {
    console.log('✗ Global style addition failed')
  }


  const styleId2 = scoper.addGlobalStyle('.global-container { background: white; }')
  if (styleId2 && typeof styleId2 === 'string') {
    console.log('✓ Global style added without ID:', styleId2)
  } else {
    console.log('✗ Global style addition without ID failed')
  }


  const globalStyles = scoper.getGlobalStyles()
  if (globalStyles && typeof globalStyles === 'object' && Object.keys(globalStyles).length >= 2) {
    console.log('✓ Global styles retrieved:', Object.keys(globalStyles))
  } else {
    console.log('✗ Global styles retrieval failed')
  }


  scoper.removeGlobalStyle('global-button-style')
  const updatedStyles = scoper.getGlobalStyles()
  if (!updatedStyles['global-button-style'] && updatedStyles[styleId2]) {
    console.log('✓ Global style removed successfully')
  } else {
    console.log('✗ Global style removal failed')
  }


  scoper.clearGlobalStyles()
  const clearedStyles = scoper.getGlobalStyles()
  if (Object.keys(clearedStyles).length === 0) {
    console.log('✓ All global styles cleared')
  } else {
    console.log('✗ Global styles clear failed')
  }


  scoper.removeGlobalStyle('non-existent-style')
  console.log('✓ Non-existent style removal handled gracefully')

} catch (error) {
  console.log('✗ Global styles management failed:', error.message)
}


delete global.document

console.log('\n=== Global Styles Management Tests Completed ===')