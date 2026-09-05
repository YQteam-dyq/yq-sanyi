
import './complete-dom-mock.mjs'


import { createComponent, mountComponent, updateComponent, DebugPanel } from '../dist/core.mjs'

console.log('🔍 开始完整集成测试...')


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


console.log('\n📋 测试2: 调试面板功能')
try {
  const debugPanel = new DebugPanel({
    position: 'top-right',
    theme: 'dark',
    autoShow: false
  })
  console.log('✅ 调试面板创建成功')
  
  debugPanel.show()
  console.log('✅ 调试面板显示成功')
  
  debugPanel.hide()
  console.log('✅ 调试面板隐藏成功')
  
  debugPanel.toggle()
  console.log('✅ 调试面板切换成功')
  

  const testDebugInfo = {
    componentTree: { 'test': { name: 'test', lifecycleState: 'mounted' } },
    updateLogs: [],
    stateSnapshot: {},
    performanceMetrics: { renderTime: 0, updateCount: 0, effectCount: 0, memoryUsage: 0 },
    errors: [],
    warnings: []
  }
  
  debugPanel.updateDebugInfo(testDebugInfo)
  console.log('✅ 调试信息更新成功')
  
  debugPanel.destroy()
  console.log('✅ 调试面板销毁成功')
  
} catch (error) {
  console.error('❌ 调试面板功能测试失败:', error)
}


console.log('\n📋 测试3: 性能测试')
try {
  const startTime = performance.now()
  
  const components = []
  for (let i = 0; i < 5; i++) {
    const component = createComponent({
      name: `perf-test-${i}`,
      template: `<div>Component ${i}</div>`,
      container: document.body
    })
    components.push(component)
  }
  
  const endTime = performance.now()
  const totalTime = endTime - startTime
  
  console.log(`✅ 创建5个组件耗时: ${totalTime}ms`)
  console.log(`✅ 平均每个组件创建时间: ${totalTime / 5}ms`)
  

  components.forEach(component => {
    component.container.innerHTML = ''
  })
  console.log('✅ 性能测试清理成功')
  
} catch (error) {
  console.error('❌ 性能测试失败:', error)
}

console.log('\n🎉 完整集成测试完成！')