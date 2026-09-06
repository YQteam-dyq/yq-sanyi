# yq-sanyi

**组件只定义一次，然后作为真正的 HTML 标签随处使用。无需构建。**

yq-sanyi（三一，"三位一体"）是一个从零自研的零依赖 Web 组件框架。每个组件把模板、行为与作用域样式封装在一次定义里，并注册为浏览器原生 HTML 元素。它只依赖 Web 标准 API 运行——无 JSX、无虚拟 DOM、无第三方运行时。

[English](./README.md) · [English tutorial](./docs/tutorial.md) · [中文教程](./docs/tutorial.zh-CN.md)

![license](https://img.shields.io/badge/license-Apache%202.0-blue)
![version](https://img.shields.io/badge/version-v0.1.0-2ea44f)
![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![size](https://img.shields.io/badge/core-8.4%20kB%20gzipped-2ea44f)

## 为什么选择 yq-sanyi

- **天生声明式。** 用 `yq.define(...)` 定义一次，之后把 `<yq-counter>` 直接写进普通 HTML——标签会自动挂载、渲染、自我清理，每个使用处都不需要任何挂载代码。
- **改 state，视图自动更新。** 在事件处理函数里修改 state 对象，对应标签就地更新；把标签从页面移除，一切随之清理。
- **零依赖、用户零构建。** 核心只有一个约 8.4 kB（gzip）的 bundle，仅依赖 Web 标准 API——无 JSX、无虚拟 DOM、无框架运行时。
- **样式隔离不泄漏。** 组件内声明的样式只作用于该组件内部；主题变量与全局样式由框架显式管理。
- **隔离与容错。** 出错的组件渲染为占位符并输出结构化告警，页面其余组件照常工作。
- **单一事实来源。** 模板、行为、样式放在一处——一个组件一个元素，易读、易复用。

## 快速开始

先构建一次 bundle，之后写普通 HTML 即可：

```bash
npm install
npm run build
```

最直接的用法是完全声明式的。把下面内容保存为 `index.html` 并打开：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi 快速开始</title>
</head>
<body>
  <yq-counter></yq-counter>

  <script src="./packages/core/dist/core.global.js"></script>
  <script>
    yq.define('yq-counter', {
      template: '<button yq-on:click="inc">计数 {{ count }}</button>',
      style: 'button { font-size: 18px; padding: 8px 18px; }',
      script: function () {
        return {
          state: { count: 0 },
          inc: function (state) {
            state.count = state.count + 1
          }
        }
      }
    })
  </script>
</body>
</html>
```

页面上的每个 `<yq-counter>` 都是一个可用的计数器。点击触发 `inc(state)`；对 state 的修改会被自动侦测并就地重渲染。在 module 脚本里可用 `./packages/core/dist/core.mjs` 获得同一套 API，另有命令式 API（`createComponent`、`mountComponent` 等）供编程式使用。

可运行的完整示例见 [examples/full-demo.html](./examples/full-demo.html)。

## 组件标签命名

组件标签就是原生自定义元素，必须遵守 HTML 自定义元素的规则：

- 以小写字母开头，
- 必须包含连字符（`-`），
- 只能使用小写字母 `a-z`、数字、`.`、`_` 与 `-`。

| 可以这样用 | 这样不行 | 原因 |
| --- | --- | --- |
| `<yq-counter>` | `<counter>` | 没有连字符——浏览器只会当作普通未知元素 |
| `<x-666>` | `<666>` | 纯数字不能作为元素名；请加连字符（`x-666`） |
| `<yq-todo-item>` | `<Todo-Item>` | 自定义元素名必须小写 |

`define` 阶段会对非法名称直接报错，拼写错误不会在页面里悄悄失效。

## v0.1.0 现有能力

- 声明式组件：`define` 注册原生自定义元素；标签自动挂载、自动更新、自动清理。
- 模板：文本绑定 `{{ 路径 }}`、整值属性绑定、布尔属性、列表渲染 `yq-for`、事件绑定 `yq-on:事件="处理函数"`。
- 组件状态：`script` 函数返回 `{ state, ...handlers }`；处理函数接收响应式 state 与事件对象。
- 响应式原语：`state`、`derived`、`effect`——effect 可返回卸载时执行的清理函数。
- 作用域样式、CSS 变量主题系统、全局样式注册表。
- 有序的挂载 / 更新 / 卸载生命周期，释放无泄漏；组件级失败隔离。
- 仓库约定：代码、示例与 docs 代码块一律零注释，由 `scripts/check-no-comments.mjs` 强制。

## 文档

| 文档 | 内容 |
| --- | --- |
| [English tutorial](./docs/tutorial.md) | Template syntax, state, effects and lifecycle from zero |
| [中文教程](./docs/tutorial.zh-CN.md) | 模板语法、状态、副作用与生命周期 |
| [完整示例](./examples/full-demo.html) | 可运行的展示页：声明式标签、事件、列表与状态 |

## 开发

```bash
npm run build
npm run test
npm run bench
npm run check:all
```

- `npm run build` — 打包 `dist/core.mjs` 与 `dist/core.global.js`
- `npm run test` — 运行核心测试套件
- `npm run bench` — 运行性能基准
- `npm run check:all` — 依赖图、gzip 预算与零注释门禁

代码、示例与 docs 代码块保持零注释；`npm run check:all` 强制执行。

## 许可证

Apache License 2.0。Copyright 2026 YQteam-dyq。详见 [LICENSE](./LICENSE)。
