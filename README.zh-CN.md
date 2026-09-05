# yq-sanyi

零依赖的 Web 组件框架。一个元素一个组件，无需构建。

yq-sanyi（三一，"三位一体"）是一个从零自研的实验性框架。组件以单个元素承载模板、行为与作用域样式，仅用 Web 标准 API 运行——无 JSX、无虚拟 DOM、无第三方运行时。

[English](./README.md) · [English tutorial](./docs/tutorial.md) · [中文教程](./docs/tutorial.zh-CN.md)

![license](https://img.shields.io/badge/license-Apache%202.0-blue)
![version](https://img.shields.io/badge/version-v0.1.0-2ea44f)
![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![build](https://img.shields.io/badge/build-none-orange)

## v0.1.0 现有能力

- 组件 API：`createComponent`、`mountComponent`、`updateComponent`、`unmountComponent`，以及 `define` / `lookup` 注册表。
- 模板：文本绑定 `{{ 路径 }}`、整值属性绑定、列表渲染 `yq-for`、条件渲染 `yq-if`。
- 响应式原语：`state`、`derived`、`effect`——effect 可返回卸载时执行的清理函数。
- 显式更新：修改状态后调用 `updateComponent`。
- 生命周期：有序的挂载 / 更新 / 卸载，effect 与订阅释放无泄漏。
- 失败隔离：故障组件渲染为占位符并记录结构化告警；同页其它组件继续正常工作。
- 仓库约定：代码、示例与 docs 代码块一律零注释，由 `scripts/check-no-comments.mjs` 强制。

## 快速开始

先构建 dist，再启动服务打开示例：

```bash
npm install
npm run build
npm run serve
```

在浏览器打开 `examples/full-demo.html`。或在普通 HTML 文件中写第一个组件：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi 问候</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createComponent, mountComponent } from './packages/core/dist/core.mjs';

    const app = createComponent({
      name: 'greeting',
      container: document.getElementById('app'),
      template: '<h1>{{ title }}</h1><p>{{ message }}</p>',
      script: () => ({
        state: {
          title: '你好，yq-sanyi',
          message: '零依赖，无构建。'
        }
      })
    });

    mountComponent(app);
  </script>
</body>
</html>
```

另有 IIFE 全局构建 `packages/core/dist/core.global.js`，以 `window.yq` 暴露同一套 API。

## 文档

| 文档 | 内容 |
| --- | --- |
| [English tutorial](./docs/tutorial.md) | Template syntax, state, effects and lifecycle from zero |
| [中文教程](./docs/tutorial.zh-CN.md) | 模板语法、状态、副作用与生命周期 |
| [完整示例](./examples/full-demo.html) | 表单、列表、条件渲染与更新 |

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
