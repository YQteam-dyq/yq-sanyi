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

console.log('=== 卸载清理校验测试 ===')


console.log('\n--- Test 1: DOM元素清理验证 ---')
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


const mountedHTML = container1.innerHTML;
const mountedChildren = container1.children.length;

unmountComponent(component1);


const finalHTML = container1.innerHTML;
const finalChildren = container1.children.length;

console.log('初始状态 - HTML长度:', initialHTML.length, '子元素数量:', initialChildren);
console.log('挂载后状态 - HTML长度:', mountedHTML.length, '子元素数量:', mountedChildren);
console.log('卸载后状态 - HTML长度:', finalHTML.length, '子元素数量:', finalChildren);

const domCleanupPassed = finalHTML.length === initialHTML.length && finalChildren === initialChildren;
console.log('DOM清理验证:', domCleanupPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 2: Effect清理验证 ---')
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

console.log('卸载前effect数量:', component2.effects.length);
console.log('卸载前effect调用次数:', effectCount);

unmountComponent(component2);

console.log('卸载后effect数量:', component2.effects.length);
console.log('卸载后effect调用次数:', effectCount);
console.log('清理函数调用次数:', cleanupCount);

const effectCleanupPassed = component2.effects.length === 0 && cleanupCount === 3;
console.log('Effect清理验证:', effectCleanupPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 3: 嵌套组件清理验证 ---')
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

console.log('嵌套组件挂载后 - Parent effects:', parentComponent.effects.length, 'Child effects:', childComponent.effects.length);
console.log('嵌套组件挂载后 - Parent effect calls:', parentEffectCount, 'Child effect calls:', childEffectCount);

unmountComponent(parentComponent);

console.log('嵌套组件卸载后 - Parent effects:', parentComponent.effects.length, 'Child effects:', childComponent.effects.length);
console.log('嵌套组件卸载后 - Parent effect calls:', parentEffectCount, 'Child effect calls:', childEffectCount);
console.log('嵌套组件卸载后 - Parent cleanup calls:', parentCleanupCount, 'Child cleanup calls:', childCleanupCount);

const nestedCleanupPassed = parentComponent.effects.length === 0 && childComponent.effects.length === 0 && 
                           parentCleanupCount === 1 && childCleanupCount === 1;
console.log('嵌套组件清理验证:', nestedCleanupPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 4: 状态引用清理验证 ---')
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


const stateCleanupPassed = Object.keys(component4.state).length === 0;
console.log('状态清理验证:', stateCleanupPassed ? '✓ 通过' : '✗ 失败');
console.log('卸载后状态引用数量:', Object.keys(component4.state).length);


console.log('\n--- Test 5: 重复卸载验证 ---')
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


try {
  unmountComponent(component5);
  const doubleUnmountPassed = true;
  console.log('重复卸载验证:', doubleUnmountPassed ? '✓ 通过' : '✗ 失败');
} catch (error) {
  console.log('重复卸载验证: ✗ 失败 (抛出异常:', error.message + ')');
}


console.log('\n=== 清理校验测试总结 ===');
const allTestsPassed = domCleanupPassed && effectCleanupPassed && nestedCleanupPassed && stateCleanupPassed;

if (allTestsPassed) {
  console.log('✓ 所有清理校验测试通过！组件卸载机制正常工作，无内存泄漏。');
} else {
  console.log('✗ 部分清理校验测试失败，需要进一步检查和修复。');
  console.log('失败的项目:', {
    domCleanup: !domCleanupPassed,
    effectCleanup: !effectCleanupPassed,
    nestedCleanup: !nestedCleanupPassed,
    stateCleanup: !stateCleanupPassed
  });
}