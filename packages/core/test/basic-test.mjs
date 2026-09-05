
global.document = {
  createElement: (tagName) => ({
    tagName,
    style: {},
    classList: {
      add: () => {},
      remove: () => {}
    },
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    removeChild: () => {},
    querySelectorAll: () => [],
    innerHTML: ''
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  head: {
    appendChild: () => {},
    removeChild: () => {}
  }
}

global.window = {
  setTimeout: (fn) => setTimeout(fn),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn) => setInterval(fn),
  clearInterval: (id) => clearInterval(id),
  addEventListener: () => {},
  removeEventListener: () => {}
}


import { createComponent, mountComponent } from '../dist/core.mjs'

console.log('🔍 开始基本功能测试...')

try {

  const testComponent = createComponent({
    name: 'basic-test',
    template: '<div id="test-div">Hello {{name}}!</div>',
    container: document.body
  })
  console.log('✅ 测试组件创建成功')
  

  mountComponent(testComponent)
  console.log('✅ 测试组件挂载成功')
  

  testComponent.state.name = 'World'
  console.log('✅ 状态变化模拟成功')
  

  testComponent.container.innerHTML = ''
  console.log('✅ 组件清理成功')
  
  console.log('\n🎉 基本功能测试完成！')
  
} catch (error) {
  console.error('❌ 基本功能测试失败:', error)
}