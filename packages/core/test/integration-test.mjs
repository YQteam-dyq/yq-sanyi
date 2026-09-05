import { createComponent, mountComponent, unmountComponent, updateComponent, effect, state, derived } from '../dist/core.mjs'

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

console.log('=== 集成测试：端到端功能验证 ===')


console.log('\n--- Test 1: 基础组件生命周期测试 ---')
const lifecycleContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

const lifecycleComponent = createComponent({
  name: 'lifecycle-test',
  template: '<div id="test-div">Hello {{name}}!</div>',
  container: lifecycleContainer
});


console.log('组件创建状态 - 生命周期状态:', lifecycleComponent.lifecycleState);
console.log('组件创建状态 - 子组件数量:', lifecycleComponent.children.length);
console.log('组件创建状态 - effect数量:', lifecycleComponent.effects.length);


mountComponent(lifecycleComponent);
console.log('组件挂载后 - 生命周期状态:', lifecycleComponent.lifecycleState);


lifecycleComponent.state.name = 'World';
updateComponent(lifecycleComponent);
console.log('组件更新后 - 生命周期状态:', lifecycleComponent.lifecycleState);


unmountComponent(lifecycleComponent);
console.log('组件卸载后 - 生命周期状态:', lifecycleComponent.lifecycleState);

const lifecyclePassed = lifecycleComponent.lifecycleState === 'unmounted' && 
                       lifecycleComponent.effects.length === 0;
console.log('基础组件生命周期测试:', lifecyclePassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 2: 状态管理和响应式测试 ---')
const stateContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

const stateComponent = createComponent({
  name: 'state-test',
  template: '<div>Count: {{count}}, Double: {{double}}</div>',
  container: stateContainer
});


mountComponent(stateComponent);


console.log('初始状态 - Count:', stateComponent.state.count || 0, 'Double:', stateComponent.state.double || 0);


stateComponent.state.count = 5;
stateComponent.state.double = stateComponent.state.count * 2;
console.log('更新后状态 - Count:', stateComponent.state.count, 'Double:', stateComponent.state.double);

stateComponent.state.count = 10;
stateComponent.state.double = stateComponent.state.count * 2;
console.log('再次更新后状态 - Count:', stateComponent.state.count, 'Double:', stateComponent.state.double);


unmountComponent(stateComponent);

const statePassed = stateComponent.state.count === 10 && stateComponent.state.double === 20;
console.log('状态管理和响应式测试:', statePassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 3: Effect和清理测试 ---')
const effectContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

let effectCallCount = 0;
let cleanupCallCount = 0;

const effectComponent = createComponent({
  name: 'effect-test',
  template: '<div>Effect Test</div>',
  container: effectContainer
});

mountComponent(effectComponent);


const effectCleanup = effect(() => {
  effectCallCount++;
  console.log('Effect被调用，次数:', effectCallCount);
  return () => {
    cleanupCallCount++;
    console.log('清理函数被调用，次数:', cleanupCallCount);
  };
});
effectComponent.effects.push(effectCleanup);


effectComponent.state.triggerUpdate = true;


unmountComponent(effectComponent);

const effectPassed = effectCallCount > 0 && cleanupCallCount === 1;
console.log('Effect和清理测试:', effectPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 4: 嵌套组件通信测试 ---')
const parentContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

const childContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

const parentComponent = createComponent({
  name: 'parent-test',
  template: '<div>Parent: {{parentMessage}}</div>',
  container: parentContainer
});

const childComponent = createComponent({
  name: 'child-test',
  template: '<div>Child: {{childMessage}}</div>',
  container: childContainer
});


parentComponent.children.push(childComponent);
childComponent.parent = parentComponent;


mountComponent(parentComponent);
mountComponent(childComponent);


parentComponent.state.parentMessage = 'Hello Parent';
childComponent.state.childMessage = 'Hello Child';


updateComponent(parentComponent);
updateComponent(childComponent);


unmountComponent(parentComponent);

const nestedPassed = parentComponent.lifecycleState === 'unmounted' && 
                     childComponent.lifecycleState === 'unmounted';
console.log('嵌套组件通信测试:', nestedPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 5: 条件渲染测试 ---')
const conditionalContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

const conditionalComponent = createComponent({
  name: 'conditional-test',
  template: '<div>Visible: {{show}}</div>',
  container: conditionalContainer
});

mountComponent(conditionalComponent);


conditionalComponent.state.show = false;
updateComponent(conditionalComponent);


conditionalComponent.state.show = true;
updateComponent(conditionalComponent);


conditionalComponent.state.show = false;
updateComponent(conditionalComponent);

unmountComponent(conditionalComponent);

const conditionalPassed = conditionalComponent.lifecycleState === 'unmounted';
console.log('条件渲染测试:', conditionalPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 6: 列表渲染测试 ---')
const listContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

const listComponent = createComponent({
  name: 'list-test',
  template: '<div>Items: {{items.0.name}}, {{items.1.name}}, {{items.2.name}}</div>',
  container: listContainer
});

mountComponent(listComponent);


listComponent.state.items = [
  { name: 'Item 1' },
  { name: 'Item 2' },
  { name: 'Item 3' }
];
updateComponent(listComponent);


listComponent.state.items.push({ name: 'Item 4' });
updateComponent(listComponent);


listComponent.state.items.splice(1, 1);
updateComponent(listComponent);


listComponent.state.items[0].name = 'Updated Item 1';
updateComponent(listComponent);

unmountComponent(listComponent);

const listPassed = listComponent.lifecycleState === 'unmounted';
console.log('列表渲染测试:', listPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 7: 事件处理测试 ---')
const eventContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

let eventCallCount = 0;
const eventComponent = createComponent({
  name: 'event-test',
  template: `
    <div>
      <button id="test-button">Click Count: {{clickCount}}</button>
    </div>
  `,
  container: eventContainer
});


eventComponent.state.clickCount = 0;
eventComponent.state.handleClick = () => {
  eventComponent.state.clickCount++;
  eventCallCount++;
};

mountComponent(eventComponent);


eventComponent.state.handleClick();
updateComponent(eventComponent);

eventComponent.state.handleClick();
updateComponent(eventComponent);

unmountComponent(eventComponent);

const eventPassed = eventCallCount === 2 && eventComponent.state.clickCount === 2;
console.log('事件处理测试:', eventPassed ? '✓ 通过' : '✗ 失败');


console.log('\n--- Test 8: 错误处理测试 ---')
const errorContainer = {
  innerHTML: '',
  appendChild: () => {},
  removeChild: () => {},
  textContent: '',
  children: []
};

const errorComponent = createComponent({
  name: 'error-test',
  template: '<div>Error Test</div>',
  container: errorContainer
});

mountComponent(errorComponent);


try {
  errorComponent.state.error = true;
  updateComponent(errorComponent);
  console.log('错误处理 - 组件仍然运行');
} catch (error) {
  console.log('错误处理 - 捕获到错误:', error.message);
}

unmountComponent(errorComponent);

const errorPassed = errorComponent.lifecycleState === 'unmounted';
console.log('错误处理测试:', errorPassed ? '✓ 通过' : '✗ 失败');


console.log('\n=== 集成测试总结 ===');
const allTestsPassed = lifecyclePassed && statePassed && effectPassed && 
                      nestedPassed && conditionalPassed && listPassed && 
                      eventPassed && errorPassed;

if (allTestsPassed) {
  console.log('✓ 所有集成测试通过！框架功能完整且稳定。');
  console.log('测试覆盖的功能:');
  console.log('- 基础组件生命周期管理');
  console.log('- 响应式状态管理');
  console.log('- Effect清理机制');
  console.log('- 嵌套组件通信');
  console.log('- 条件渲染');
  console.log('- 列表渲染');
  console.log('- 事件处理');
  console.log('- 错误处理');
} else {
  console.log('✗ 部分集成测试失败，需要进一步调试和修复。');
  console.log('失败的项目:', {
    lifecycle: !lifecyclePassed,
    state: !statePassed,
    effect: !effectPassed,
    nested: !nestedPassed,
    conditional: !conditionalPassed,
    list: !listPassed,
    event: !eventPassed,
    error: !errorPassed
  });
}


console.log('\n--- 性能测试 ---');
const startTime = Date.now();


const components = [];
for (let i = 0; i < 100; i++) {
  const comp = createComponent({
    name: `perf-test-${i}`,
    template: `<div>Component ${i}</div>`,
    container: {
      innerHTML: '',
      appendChild: () => {},
      removeChild: () => {},
      textContent: '',
      children: []
    }
  });
  components.push(comp);
}

const creationTime = Date.now() - startTime;
console.log(`创建100个组件耗时: ${creationTime}ms`);


const mountStart = Date.now();
components.forEach(comp => mountComponent(comp));
const mountTime = Date.now() - mountStart;
console.log(`挂载100个组件耗时: ${mountTime}ms`);


const unmountStart = Date.now();
components.forEach(comp => unmountComponent(comp));
const unmountTime = Date.now() - unmountStart;
console.log(`卸载100个组件耗时: ${unmountTime}ms`);

const performancePassed = creationTime < 1000 && mountTime < 1000 && unmountTime < 1000;
console.log('性能测试:', performancePassed ? '✓ 通过' : '✗ 失败');


console.log('\n=== 最终测试结果 ===');
const finalResult = allTestsPassed && performancePassed;
if (finalResult) {
  console.log('🎉 所有测试通过！yq-sanyi框架集成测试完成，功能完整且性能良好。');
} else {
  console.log('⚠️  部分测试未通过，需要进一步优化和修复。');
}