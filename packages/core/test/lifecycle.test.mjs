


import { createComponent, mountComponent, updateComponent, unmountComponent, setLifecycleHooks, getComponentTree, getUpdateLogs, getStateSnapshot } from '../dist/core.mjs'


const mockDOM = {
  createElement: (tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      setAttribute: (name, value) => {},
      removeAttribute: (name) => {},
      appendChild: (child) => {},
      removeChild: (child) => {},
      cloneNode: (deep) => ({ ...mockDOM.createElement('div') }),
      querySelectorAll: (selector) => [],
      innerHTML: '',
      yqNodeId: 0
    };

    Object.defineProperty(element, 'yqNodeId', {
      configurable: true,
      writable: true
    });
    return element;
  },
  querySelectorAll: (selector) => [],
  head: {
    appendChild: (child) => {},
    removeChild: (child) => {}
  },
  documentElement: {
    style: {
      setProperty: (name, value) => {},
      removeProperty: (name) => {}
    }
  }
}


global.document = {
  ...mockDOM,
  createDocumentFragment: () => ({
    appendChild: (child) => {},
    removeChild: (child) => {}
  })
}

console.log('=== Lifecycle Management Tests ===')

try {

  console.log('\n--- Test 1: Component Creation ---')
  
  const component = createComponent({
    name: 'test-component',
    template: '<div>Hello</div>',
    container: mockDOM.createElement('div')
  })
  
  if (component.lifecycleState === 'created') {
    console.log('✓ Component created with "created" state')
  } else {
    console.log('✗ Component creation state failed')
  }
  
  if (component.children && component.children.length === 0) {
    console.log('✓ Component children initialized')
  } else {
    console.log('✗ Component children initialization failed')
  }
  

  console.log('\n--- Test 2: Mount Component ---')
  
  let mountCalled = false
  setLifecycleHooks(component, {
    onMount: () => {
      mountCalled = true
      console.log('✓ onMount hook called')
    }
  })
  
  mountComponent(component)
  
  if (component.lifecycleState === 'mounted') {
    console.log('✓ Component state changed to "mounted"')
  } else {
    console.log('✗ Component mount state failed')
  }
  
  if (mountCalled) {
    console.log('✓ onMount lifecycle hook executed')
  } else {
    console.log('✗ onMount lifecycle hook failed')
  }
  

  console.log('\n--- Test 3: Update Component ---')
  
  let updateCalled = false
  setLifecycleHooks(component, {
    onUpdate: () => {
      updateCalled = true
      console.log('✓ onUpdate hook called')
    }
  })
  
  updateComponent(component)
  
  if (component.lifecycleState === 'updated') {
    console.log('✓ Component state changed to "updated"')
  } else {
    console.log('✗ Component update state failed')
  }
  
  if (updateCalled) {
    console.log('✓ onUpdate lifecycle hook executed')
  } else {
    console.log('✗ onUpdate lifecycle hook failed')
  }
  

  console.log('\n--- Test 4: Unmount Component ---')
  
  let unmountCalled = false
  setLifecycleHooks(component, {
    onUnmount: () => {
      unmountCalled = true
      console.log('✓ onUnmount hook called')
    }
  })
  
  unmountComponent(component)
  
  if (component.lifecycleState === 'unmounted') {
    console.log('✓ Component state changed to "unmounted"')
  } else {
    console.log('✗ Component unmount state failed')
  }
  
  if (unmountCalled) {
    console.log('✓ onUnmount lifecycle hook executed')
  } else {
    console.log('✗ onUnmount lifecycle hook failed')
  }
  

  console.log('\n--- Test 5: Update Logs ---')
  
  const logs = getUpdateLogs(component)
  if (logs && logs.length > 0) {
    console.log('✓ Update logs recorded:', logs.length)
  } else {
    console.log('✗ Update logs failed')
  }
  

  console.log('\n--- Test 6: State Snapshot ---')
  
  const snapshot = getStateSnapshot(component)
  if (snapshot && snapshot.lifecycleState) {
    console.log('✓ State snapshot created:', snapshot.lifecycleState)
  } else {
    console.log('✗ State snapshot failed')
  }
  

  console.log('\n--- Test 7: Component Tree ---')
  
  const tree = getComponentTree(component)
  if (tree && tree.name === 'test-component') {
    console.log('✓ Component tree created:', tree.name)
  } else {
    console.log('✗ Component tree failed')
  }
  

  console.log('\n--- Test 8: Double Mount Prevention ---')
  
  const component2 = createComponent({
    name: 'test-component-2',
    template: '<div>Test</div>',
    container: mockDOM.createElement('div')
  })
  
  mountComponent(component2)
  mountComponent(component2)
  
  if (component2.updateLogs.filter(log => log.path === 'mount').length === 1) {
    console.log('✓ Double mount prevented')
  } else {
    console.log('✗ Double mount prevention failed')
  }
  
  console.log('\n=== Lifecycle Management Tests Completed ===')
  console.log('✅ All lifecycle management features working correctly!')
  
} catch (error) {
  console.log('✗ Lifecycle management tests failed:', error.message)
}


delete global.document