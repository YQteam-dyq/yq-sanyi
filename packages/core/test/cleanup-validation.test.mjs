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

test('Test 1: DOM元素清理验证', () => {
  const container1 = {
    innerHTML: '',
    appendChild: () => {},
    removeChild: () => {},
    textContent: '',
    children: []
  };

  const component1 = createComponent({
    name: 'cleanup-test-1',
    template: '<div id="test-div">Hello<span>World</span></div>',
    container: container1
  });

  const initialHTML = container1.innerHTML;
  const initialChildren = container1.children.length;

  mountComponent(component1);

  unmountComponent(component1);

  const finalHTML = container1.innerHTML;
  const finalChildren = container1.children.length;

  assert.equal(finalHTML.length, initialHTML.length);
  assert.equal(finalChildren, initialChildren);
});

test('Test 2: Effect清理验证', () => {
  let effectCount = 0;
  let cleanupCount = 0;

  const component2 = createComponent({
    name: 'cleanup-test-2',
    template: '<div>Test</div>',
    container: {
      innerHTML: '',
      appendChild: () => {},
      removeChild: () => {},
      textContent: '',
      children: []
    }
  });

  mountComponent(component2);

  for (let i = 0; i < 3; i++) {
    const cleanup = effect(() => {
      effectCount++;
      return () => {
        cleanupCount++;
      };
    });
    component2.effects.push(cleanup);
  }

  unmountComponent(component2);

  assert.equal(component2.effects.length, 0);
  assert.equal(cleanupCount, 3);
});

test('Test 3: 嵌套组件清理验证', () => {
  let parentEffectCount = 0;
  let childEffectCount = 0;
  let parentCleanupCount = 0;
  let childCleanupCount = 0;

  const parentComponent = createComponent({
    name: 'parent-cleanup-test',
    template: '<div>Parent</div>',
    container: {
      innerHTML: '',
      appendChild: () => {},
      removeChild: () => {},
      textContent: '',
      children: []
    }
  });

  const childComponent = createComponent({
    name: 'child-cleanup-test',
    template: '<div>Child</div>',
    container: {
      innerHTML: '',
      appendChild: () => {},
      removeChild: () => {},
      textContent: '',
      children: []
    }
  });

  const parentCleanup = effect(() => {
    parentEffectCount++;
    return () => {
      parentCleanupCount++;
    };
  });
  parentComponent.effects.push(parentCleanup);

  const childCleanup = effect(() => {
    childEffectCount++;
    return () => {
      childCleanupCount++;
    };
  });
  childComponent.effects.push(childCleanup);

  parentComponent.children.push(childComponent);
  childComponent.parent = parentComponent;

  mountComponent(parentComponent);
  mountComponent(childComponent);

  unmountComponent(parentComponent);

  assert.equal(parentComponent.effects.length, 0);
  assert.equal(childComponent.effects.length, 0);
  assert.equal(parentCleanupCount, 1);
  assert.equal(childCleanupCount, 1);
});

test('Test 4: 状态引用清理验证', () => {
  let stateValue = 'initial';
  const testState = state(stateValue);

  const component4 = createComponent({
    name: 'state-cleanup-test',
    template: '<div>State Test</div>',
    container: {
      innerHTML: '',
      appendChild: () => {},
      removeChild: () => {},
      textContent: '',
      children: []
    }
  });

  mountComponent(component4);

  stateValue = 'modified';
  testState.value = 'modified';

  const stateReferences = [];
  for (let key in component4.state) {
    stateReferences.push(key);
  }

  unmountComponent(component4);

  assert.equal(Object.keys(component4.state).length, 0);
});

test('Test 5: 重复卸载验证', () => {
  const component5 = createComponent({
    name: 'double-unmount-test',
    template: '<div>Double Unmount Test</div>',
    container: {
      innerHTML: '',
      appendChild: () => {},
      removeChild: () => {},
      textContent: ''
    }
  });

  mountComponent(component5);
  unmountComponent(component5);

  assert.doesNotThrow(() => {
    unmountComponent(component5);
  });

  delete global.document;
});
