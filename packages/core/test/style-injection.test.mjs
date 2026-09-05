
import { scoper } from '../dist/core.mjs'


const mockStyleElements = []
const mockDocument = {
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


global.document = mockDocument

console.log('=== Style Injection Management Tests ===')


console.log('\nTest 1: Multiple instances of same CSS')

const css1 = '.button { color: red; }'
const injection1 = scoper.injectStyle(css1, 'scope-1')
console.log('✓ First injection created:', injection1.id)

const injection2 = scoper.injectStyle(css1, 'scope-1')
console.log('✓ Second injection reuses same style:', injection2.id === injection1.id)
console.log('✓ Reference count:', injection1.references)


console.log('\nTest 2: Different CSS creates separate injections')

const css2 = '.container { background: blue; }'
const injection3 = scoper.injectStyle(css2, 'scope-2')
console.log('✓ Different CSS creates new injection:', injection3.id !== injection1.id)


console.log('\nTest 3: Remove style decreases reference count')

scoper.removeStyle(injection1)
console.log('✓ Reference count after removal:', injection1.references)


console.log('\nTest 4: Remove all references cleans up style')

scoper.removeStyle(injection1)
console.log('✓ Style element removed when references reach 0:', mockStyleElements.length === 0)


console.log('\nTest 5: Different scope IDs create separate injections')

const injection4 = scoper.injectStyle(css1, 'scope-3')
const injection5 = scoper.injectStyle(css1, 'scope-4')
console.log('✓ Different scope IDs create separate injections:', injection4.id !== injection5.id)


delete global.document

console.log('\n=== Style Injection Management Tests Completed ===')