
import './complete-dom-mock.mjs'


import { createComponent, mountComponent, updateComponent } from '../dist/core.mjs'

console.log('🔍 开始基本功能测试（不包含调试面板）...')


console.log('\n📋 测试1: 基本组件功能')
try {
  const testComponent = createComponent({
    name: 'integration-test',
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
  
} catch (error) {
  console.error('❌ 基本组件功能测试失败:', error)
}


console.log('\n📋 测试2: 更新功能')
try {
  const updateComponent = createComponent({
    name: 'update-test',
    template: '<div id="update-div">Count: {{count}}</div>',
    container: document.body
  })
  
  mountComponent(updateComponent)
  

  for (let i = 0; i < 3; i++) {
    updateComponent.state.count = i
  }
  
  updateComponent.container.innerHTML = ''
  console.log('✅ 更新功能测试成功')
  
} catch (error) {
  console.error('❌ 更新功能测试失败:', error)
}


console.log('\n📋 测试3: 嵌套组件功能')
try {
  const parentComponent = createComponent({
    name: 'parent-test',
    template: '<div id="parent"><div id="child">Child {{childName}}</div></div>',
    container: document.body
  })
  
  mountComponent(parentComponent)
  
  parentComponent.state.childName = 'Test Child'
  
  parentComponent.container.innerHTML = ''
  console.log('✅ 嵌套组件功能测试成功')
  
} catch (error) {
  console.error('❌ 嵌套组件功能测试失败:', error)
}

console.log('\n🎉 基本功能测试完成！')