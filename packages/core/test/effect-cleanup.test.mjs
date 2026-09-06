import { test } from 'node:test'
import assert from 'node:assert/strict'
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

test('effect cleanup runs when the returned function is invoked', () => {
  let cleanupCount = 0;

  const cleanup1 = effect(() => {
    return () => {
      cleanupCount++;
    };
  });

  cleanup1();

  assert.strictEqual(cleanupCount, 1);
});

test('component with effect cleanup', () => {
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
    };
  });

  unmountComponent(component);

  cleanup2();

  assert.strictEqual(componentCleanupCount, 1);
});

test('multiple effects each clean up once', () => {
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

  assert.strictEqual(multipleCleanupCount, 5);
});
