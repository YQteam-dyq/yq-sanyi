# yq-sanyi 全链路演示文档

## 概述

全链路演示是 yq-sanyi 框架的完整功能展示，涵盖了从解析器到渲染管线的完整链路，包括响应式状态管理、列表渲染、表单处理等核心功能。

## 演示功能

### 1. 基础文本绑定
- **动态标题**: 展示组件标题的动态更新
- **欢迎消息**: 显示欢迎信息的文本绑定
- **实时状态**: 实时更新当前时间

**技术实现**:
```javascript
state: {
    appTitle: 'yq-sanyi 全链路演示',
    welcomeMessage: '欢迎使用零依赖现代Web框架！',
    currentTime: new Date().toLocaleString()
}
```

### 2. 属性绑定
- **输入框**: 双向数据绑定，实时显示输入值
- **按钮状态**: 根据状态动态禁用/启用按钮
- **图片属性**: 动态绑定图片源地址

**技术实现**:
```javascript
state: {
    inputValue: '',
    isButtonDisabled: false,
    imageUrl: 'https://via.placeholder.com/150'
}
```

### 3. 列表渲染
- **用户列表**: 渲染用户列表，支持条件渲染（VIP标识）
- **产品列表**: 渲染产品信息，包括价格和库存

**技术实现**:
```javascript
state: {
    users: [
        { name: '张三', age: 25, isVip: true },
        { name: '李四', age: 30, isVip: false }
    ],
    products: [
        { name: '笔记本电脑', price: 5999, stock: 10 }
    ]
}
```

### 4. 响应式计数器
- **计数显示**: 大字体显示当前计数值
- **操作按钮**: 增加、减少、重置功能
- **统计信息**: 显示点击次数和奇偶性

**技术实现**:
```javascript
state: {
    count: 0,
    clickCount: 0
},
derived: {
    evenOdd: (state) => state.count % 2 === 0 ? '偶数' : '奇数'
}
```

### 5. 待办事项管理
- **添加任务**: 输入框添加新任务
- **任务列表**: 渲染所有任务
- **状态切换**: 复选框切换任务完成状态
- **删除任务**: 删除指定任务
- **统计信息**: 显示完成数量、待完成数量和完成率

**技术实现**:
```javascript
state: {
    todos: []
},
derived: {
    completedCount: (state) => state.todos.filter(todo => todo.completed).length,
    completionRate: (state) => {
        const total = state.todos.length
        const completed = state.todos.filter(todo => todo.completed).length
        return total === 0 ? 0 : Math.round((completed / total) * 100)
    }
}
```

### 6. 表单处理
- **表单字段**: 姓名、邮箱、年龄、留言
- **数据绑定**: 双向绑定表单数据
- **表单提交**: 提交后显示表单数据
- **数据验证**: HTML5 原生验证

**技术实现**:
```javascript
state: {
    formData: {
        name: '',
        email: '',
        age: '',
        message: ''
    },
    formDataSubmitted: false
}
```

### 7. 实时数据监控
- **系统状态**: 内存使用、CPU使用、网络状态
- **性能指标**: 页面加载时间、渲染次数、内存峰值
- **实时更新**: 定时更新模拟数据

**技术实现**:
```javascript
state: {
    memoryUsage: 45,
    cpuUsage: 23,
    networkStatus: '正常',
    renderCount: 0
},
effect: () => {
    const statusInterval = setInterval(() => {
        globalState.memoryUsage = Math.floor(Math.random() * 100)
        globalState.cpuUsage = Math.floor(Math.random() * 100)
        globalState.renderCount++
    }, 3000)
    
    return () => clearInterval(statusInterval)
}
```

## 核心技术栈

### 1. 解析器 (parser.ts)
- **功能**: 解析模板字符串，生成组件定义对象 (CDO)
- **特性**: 支持文本绑定、属性绑定、列表渲染
- **输出**: SNode 树结构、Slot 数组

### 2. 响应式系统 (reactive.ts)
- **state**: 基础状态管理
- **derived**: 派生状态，自动计算
- **effect**: 副作用处理，自动清理

### 3. 渲染管线 (render.ts)
- **静态骨架**: 克隆静态 DOM 结构
- **绑定槽位**: 填充动态数据
- **列表更新**: 高效的列表渲染和更新

### 4. 组件管理 (component.ts)
- **createComponent**: 创建组件实例
- **mountComponent**: 挂载组件
- **updateComponent**: 更新组件
- **unmountComponent**: 卸载组件

## 使用方法

### 1. 直接打开
```bash
# 在浏览器中直接打开
open examples/full-demo.html
```

### 2. 通过本地服务器
```bash
# 启动本地服务器
python3 -m http.server 8000

# 访问 http://localhost:8000/examples/full-demo.html
```

### 3. 集成到项目
```html
<!DOCTYPE html>
<html>
<head>
    <script src="packages/core/src/parser.js"></script>
    <script src="packages/core/src/reactive.js"></script>
    <script src="packages/core/src/render.js"></script>
    <script src="packages/core/src/component.js"></script>
</head>
<body>
    <script>
        const component = createComponent({
            name: 'my-component',
            template: '<div>{{ message }}</div>',
            script: () => ({
                state: { message: 'Hello World' }
            })
        })
        
        mountComponent(component)
    </script>
</body>
</html>
```

body 内的脚本先通过 `createComponent` 创建组件（含 name/template/script 三段配置），再调用 `mountComponent` 将组件挂载到页面。

## 性能特点

### 1. 零依赖
- 仅使用 Web 标准 API
- 无第三方库依赖
- 单文件部署

### 2. 高性能
- 静态骨架复用
- 最小化 DOM 操作
- 批量更新机制

### 3. 响应式
- 自动依赖追踪
- 精确更新
- 内存管理

## 扩展性

### 1. 自定义指令
可以通过扩展解析器添加自定义指令支持。

### 2. 组件系统
支持组件嵌套和复用。

### 3. 插件机制
可以通过插件扩展框架功能。

## 测试

### 1. 功能测试
- 基础文本绑定
- 属性绑定
- 列表渲染
- 响应式更新
- 表单处理

### 2. 性能测试
- 渲染性能
- 更新性能
- 内存使用

### 3. 兼容性测试
- 现代浏览器
- 移动设备
- 不同屏幕尺寸

## 总结

全链路演示展示了 yq-sanyi 框架的完整功能，从模板解析到渲染管线的完整链路。框架具有以下特点：

1. **零依赖**: 仅使用 Web 标准 API
2. **高性能**: 静态骨架 + 绑定槽位
3. **响应式**: 自动依赖追踪和更新
4. **易用性**: 简单的 API 设计
5. **扩展性**: 支持自定义指令和组件

这个演示可以作为学习和使用 yq-sanyi 框架的参考，也可以作为评估框架功能的基准。