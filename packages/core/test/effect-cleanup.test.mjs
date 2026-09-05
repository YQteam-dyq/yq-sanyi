import { createComponent, mountComponent, unmountComponent, effect, state } from '../dist/core.mjs'

global.document = {
  createElement: (tag) => {
    const element = {
      tagName: tag.toUpperCase(), 
      innerHTML: '',
      dataset: new Proxy({}, {
        set: (target, prop, value) => {
          target[prop] = value;
          return true;
        }
      }),
      setAttribute: (name, value) => {
        element.dataset[name] = value;
      },
      cloneNode: (deep) => ({
        tagName: tag.toUpperCase(),
        innerHTML: '',
        dataset: new Proxy({}, {
          set: (target, prop, value) => {
            target[prop] = value;
            return true;
          }
        }),
        setAttribute: (name, value) => {
          element.dataset[name] = value;
        },
        children: []
      }),
      querySelectorAll: () => [],
      appendChild: (child) => {
        element.children.push(child);
      },
      removeChild: (child) => {
        const index = element.children.indexOf(child);
        if (index > -1) {
          element.children.splice(index, 1);
        }
      },
      textContent: '',
      children: []
    };
    Object.defineProperty(element, 'yqNodeId', {
      configurable: true,
      writable: true
    });
    return element;
  },
  createDocumentFragment: () => ({ 
    appendChild: (child) => {}, 
    removeChild: (child) => {},
    children: []
  }),
  querySelectorAll: () => [],
  head: {
    appendChild: () => {},
    removeChild: () => {},
    children: []
  }
};

console.log('=== Effect Cleanup Tests ===')


console.log('\n--- Test 1: Effect cleanup ---')
let cleanupCount = 0;

const cleanup1 = effect(() => {
  console.log('Effect running');
  return () => {
    cleanupCount++;
    console.log('Cleanup called');
  };
});


cleanup1();


console.log('\n--- Test 2: Component with effect cleanup ---')
let componentCleanupCount = 0;

const container = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: ''
};

const component = createComponent({
  name: 'test-component',
  template: '<div>Hello</div>',
  container: container
});

mountComponent(component);

const cleanup2 = effect(() => {
  return () => {
    componentCleanupCount++;
    console.log('Component cleanup called');
  };
});

unmountComponent(component);


cleanup2();


console.log('\n--- Test 3: Multiple effects ---')
let multipleCleanupCount = 0;
const cleanups = [];

for (let i = 0; i < 5; i++) {
  const cleanup = effect(() => {
    return () => {
      multipleCleanupCount++;
    };
  });
  cleanups.push(cleanup);
}


cleanups.forEach(cleanup => cleanup());

console.log('Cleanup count:', multipleCleanupCount);


if (cleanupCount === 1 && componentCleanupCount === 1 && multipleCleanupCount === 5) {
  console.log('\n✓ All cleanup tests passed!');
} else {
  console.log('\n✗ Cleanup tests failed. Expected:', { cleanupCount: 1, componentCleanupCount: 1, multipleCleanupCount: 5 }, 'Actual:', { cleanupCount, componentCleanupCount, multipleCleanupCount });
}