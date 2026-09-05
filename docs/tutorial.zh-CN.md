# yq-sanyi 教程

从零开始学会 yq-sanyi：环境准备、模板语法、响应式状态、副作用与生命周期。仓库遵循全项目零注释约定，因此以下所有示例都刻意不写注释。

> English: [English Tutorial](./tutorial.md)

## 目录

1. [你将完成什么](#你将完成什么)
2. [环境准备](#环境准备)
3. [第一个组件](#第一个组件)
4. [模板语法](#模板语法)
5. [状态、派生值与副作用](#状态派生值与副作用)
6. [事件与更新](#事件与更新)
7. [生命周期与清理](#生命周期与清理)
8. [常见问题](#常见问题)
9. [下一步](#下一步)

## 你将完成什么

先做一个计数器页面，再做用户列表，最后做一个表单。它们会覆盖框架的全部核心概念：单文件组件、声明式模板、响应式状态、派生值、带自动清理的副作用，以及显式更新。

## 环境准备

核心运行时被打包为 `packages/core/dist/core.mjs`（ES 模块）和 `packages/core/dist/core.global.js`（IIFE 全局构建）。dist 目录在本地生成：

```bash
npm install
npm run build
```

启动本地服务并在浏览器中打开示例：

```bash
npm run serve
```

也可以新建独立 HTML 文件，按其在仓库中的位置引入运行时：位于仓库根目录的文件用 `./packages/core/dist/core.mjs`，位于 `examples/` 内的文件用 `../packages/core/dist/core.mjs`。请按实际位置调整相对路径。

## 第一个组件

组件是一个对象：模板字符串、返回状态的脚本函数，以及要挂载到的容器。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>我的第一个 yq-sanyi 组件</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createComponent, mountComponent } from './packages/core/dist/core.mjs';

    const greeting = createComponent({
      name: 'greeting',
      container: document.getElementById('app'),
      template: '<h1>{{ title }}</h1><p>{{ message }}</p>',
      script: () => ({
        state: {
          title: '你好，yq-sanyi',
          message: '一个零依赖的 Web 框架。'
        }
      })
    });

    mountComponent(greeting);
  </script>
</body>
</html>
```

运行后即可看到两行内容渲染出来。这里发生了两件事：

1. `createComponent` 解析了一次模板，并把动态点登记为绑定槽。
2. `mountComponent` 克隆静态骨架，并用状态完成填槽。

模板就是普通 HTML 加 `{{ 路径 }}` 占位符；状态值用点路径读取，例如 `user.name`。

## 模板语法

### 文本绑定

```html
<div>{{ message }}</div>
```

### 属性绑定

属性值整体为占位符时即被绑定到状态，每次更新都会回写。

```html
<input value="{{ inputValue }}">
```

### 列表渲染

在容器元素上加 `yq-for="item in items"`。框架会为每个列表项渲染一份副本，并在列表变化时更新。

```html
<ul>
  <li yq-for="user in users">{{ user.name }}</li>
</ul>
```

### 条件渲染

给元素加 `yq-if="条件"`，仅当状态路径为真值时渲染。

```html
<div yq-if="isVip">VIP 会员</div>
```

### 双向绑定式表单字段

`yq-model="路径"` 把输入框绑定到状态。

```html
<input type="text" yq-model="formData.name">
```

## 状态、派生值与副作用

脚本函数可返回三部分：`state`、`derived` 与 `effect`。

- `state` 存放普通响应式字段，模板用 `{{ }}` 读取。
- `derived` 只在依赖变化时重新计算记忆化值。
- `effect` 在挂载后执行一次，可返回卸载时运行的清理函数。

```javascript
const counter = createComponent({
  name: 'counter',
  container: document.getElementById('app'),
  template: `
    <div>
      <p>计数：{{ count }}</p>
      <p>两倍：{{ double }}</p>
      <button onclick="bump()">+1</button>
    </div>
  `,
  script: () => ({
    state: {
      count: 0
    },
    derived: {
      double: (state) => state.count * 2
    },
    effect: () => {
      console.log('计数器已挂载');
      return () => {
        console.log('计数器已卸载');
      };
    }
  })
});
```

## 事件与更新

内联事件处理器调用你挂到 `window` 上的函数。修改状态不会自动渲染，需调用 `updateComponent` 把新状态刷写到 DOM，让更新显式、可预期。

```javascript
window.bump = () => {
  counter.state.count = counter.state.count + 1;
  updateComponent(counter);
};

mountComponent(counter);
```

上面的完整流程：点击调用 `bump` → 状态变化 → `updateComponent` 只重写脏槽 → `double` 因依赖变化而重新计算。

## 生命周期与清理

卸载会释放组件注册的一切——effect、derived 订阅与 DOM 节点——反复创建/移除不会留下残留。

```javascript
mountComponent(counter);

setTimeout(() => {
  unmountComponent(counter);
  console.log('计数器已移除');
}, 5000);
```

如果 effect 启动了定时器、订阅或请求，请从 effect 返回一个清理函数，它会在卸载时被自动调用。这正是防止内存泄漏的机制。

## 常见问题

| 现象 | 原因与修复 |
| --- | --- |
| 什么都没渲染 | 容器元素不存在或运行时路径不对。检查 `document.getElementById` 与 import 路径。 |
| 占位符文本仍显示 | `{{ }}` 里的状态路径与 state 字段不匹配。路径以点分隔，例如 `{{ user.name }}`。 |
| 点击按钮无反应 | 处理器没有挂到 `window`，或改了状态却没调用 `updateComponent`。 |
| 属性绑定报错 | 只支持整值属性绑定；`class="{{ a }} {{ b }}"` 这类部分绑定会被设计性地拒绝。 |
| 组件解析失败 | 错误边界会显示占位符并记录结构化告警；同页其它组件继续正常工作。 |

## 下一步

- 阅读 README 中的 [API 一览](../README.zh-CN.md#api-一览)。
- 打开 `examples/full-demo.html` 完整示例，查看表单、列表与条件渲染的组合。
- 阅读本教程英文版：[English Tutorial](./tutorial.md)。
