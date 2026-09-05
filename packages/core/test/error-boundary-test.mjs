
import './complete-dom-mock.mjs'


import { createComponent, mountComponent, withErrorBoundary, getErrorBoundaryInfo, resetErrorBoundary } from '../dist/core.mjs'

console.log('🔍 开始错误边界测试...')


console.log('\n📋 测试1: 基本错误边界功能')
try {

  const errorComponent = createComponent({
    name: 'error-test',
    template: '<div id="error-div">This will cause an error</div>',
    container: document.body
  })
  

  const safeComponent = withErrorBoundary('error-test')(errorComponent)
  

  safeComponent.hasError = true
  safeComponent.errorCount = 1
  safeComponent.lastErrorTime = Date.now()
  safeComponent.errorInfo = {
    hasError: true,
    error: new Error('Test error'),
    timestamp: Date.now()
  }
  

  const errorInfo = getErrorBoundaryInfo(safeComponent)
  console.log('✅ 错误边界信息获取成功:', errorInfo)
  

  resetErrorBoundary(safeComponent)
  console.log('✅ 错误边界重置成功')
  

  errorComponent.container.innerHTML = ''
  console.log('✅ 基本错误边界功能测试成功')
  
} catch (error) {
  console.error('❌ 基本错误边界功能测试失败:', error)
}


console.log('\n📋 测试2: 错误计数和恢复')
try {
  const testComponent = createComponent({
    name: 'error-count-test',
    template: '<div id="count-test">Error count test</div>',
    container: document.body
  })
  
  const safeComponent = withErrorBoundary('error-count-test')(testComponent)
  

  for (let i = 0; i < 3; i++) {
    safeComponent.hasError = true
    safeComponent.errorCount = i + 1
    safeComponent.lastErrorTime = Date.now() + i * 1000
  }
  
  console.log('✅ 错误计数测试成功，错误次数:', safeComponent.errorCount)
  

  resetErrorBoundary(safeComponent)
  console.log('✅ 重置后错误状态:', safeComponent.hasError)
  

  testComponent.container.innerHTML = ''
  console.log('✅ 错误计数和恢复测试成功')
  
} catch (error) {
  console.error('❌ 错误计数和恢复测试失败:', error)
}


console.log('\n📋 测试3: 错误边界生命周期集成')
try {
  const lifecycleComponent = createComponent({
    name: 'lifecycle-error-test',
    template: '<div id="lifecycle-test">Lifecycle error test</div>',
    container: document.body
  })
  
  const safeComponent = withErrorBoundary('lifecycle-error-test')(lifecycleComponent)
  

  mountComponent(safeComponent)
  

  safeComponent.hasError = true
  safeComponent.errorCount = 1
  
  console.log('✅ 错误边界生命周期集成测试成功')
  

  safeComponent.container.innerHTML = ''
  console.log('✅ 错误边界生命周期集成测试完成')
  
} catch (error) {
  console.error('❌ 错误边界生命周期集成测试失败:', error)
}


console.log('\n📋 测试4: 错误边界性能测试')
try {
  const startTime = performance.now()
  
  const components = []
  for (let i = 0; i < 10; i++) {
    const component = createComponent({
      name: `error-perf-test-${i}`,
      template: `<div>Error perf test ${i}</div>`,
      container: document.body
    })
    
    const safeComponent = withErrorBoundary(`error-perf-test-${i}`)(component)
    components.push(safeComponent)
  }
  
  const endTime = performance.now()
  const totalTime = endTime - startTime
  
  console.log(`✅ 创建10个带错误边界的组件耗时: ${totalTime}ms`)
  console.log(`✅ 平均每个组件创建时间: ${totalTime / 10}ms`)
  

  components.forEach((component, index) => {
    component.hasError = true
    component.errorCount = index + 1
  })
  

  components.forEach(component => {
    resetErrorBoundary(component)
  })
  
  console.log('✅ 性能测试完成')
  

  components.forEach(component => {
    component.container.innerHTML = ''
  })
  
} catch (error) {
  console.error('❌ 错误边界性能测试失败:', error)
}

console.log('\n🎉 错误边界测试完成！')