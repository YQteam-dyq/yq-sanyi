
import { scoper } from '../dist/core.mjs'


const { generateScopedCSS, injectStyle, removeStyle, updateTheme, createScopedElement } = scoper


const mockDocument = {
  createElement: (tagName) => ({
    tagName,
    textContent: '',
    setAttribute: (key, value) => {},
    remove: () => {}
  }),
  head: {
    appendChild: (element) => {}
  }
}


console.log('Testing generateScopedCSS...')


const basicCSS = `
  .button {
    color: red;
  }
  .container {
    background: blue;
  }
`

const scopedCSS = generateScopedCSS(basicCSS, 'test-scope')
console.log('Original CSS:', basicCSS)
console.log('Scoped CSS:', scopedCSS)


if (scopedCSS.includes('.button[data-yq-scope="test-scope"]')) {
  console.log('✓ Basic CSS scoping works')
} else {
  console.log('✗ Basic CSS scoping failed')
}


const emptyCSS = ''
const emptyScoped = generateScopedCSS(emptyCSS, 'test-scope')
if (emptyScoped === '') {
  console.log('✓ Empty CSS handling works')
} else {
  console.log('✗ Empty CSS handling failed')
}


const globalCSS = `
  * {
    margin: 0;
  }
  .local-class {
    padding: 10px;
  }
`

const globalScoped = generateScopedCSS(globalCSS, 'test-scope')
if (globalScoped.includes('*') && globalScoped.includes('.local-class[data-yq-scope="test-scope"]')) {
  console.log('✓ Global selectors preserved')
} else {
  console.log('✗ Global selectors handling failed')
}


const pseudoCSS = `
  .button:hover {
    color: blue;
  }
  .input:focus {
    outline: none;
  }
`

const pseudoScoped = generateScopedCSS(pseudoCSS, 'test-scope')
if (pseudoScoped.includes('.button:hover') && pseudoScoped.includes('.input:focus')) {
  console.log('✓ Pseudo-classes preserved')
} else {
  console.log('✗ Pseudo-classes handling failed')
}


console.log('\nTesting injectStyle and removeStyle...')


const mockStyleElements = []
const mockDOM = {
  createElement: (tagName) => ({
    tagName,
    textContent: '',
    setAttribute: (key, value) => {},
    remove: () => {}
  }),
  head: {
    appendChild: (element) => {
      mockStyleElements.push(element)
    }
  }
}


global.document = mockDOM

try {

  const injection = injectStyle('.test { color: red; }', 'test-scope')
  console.log('✓ Style injection works')
  

  removeStyle(injection)
  console.log('✓ Style removal works')
  
} catch (error) {
  console.log('✗ Style injection/removal failed:', error.message)
}


delete global.document

console.log('\nScoper module tests completed!')