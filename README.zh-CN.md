# yq-sanyi 三一

**零依赖、无构建的 Web 框架 —— 组件结构、行为、样式三位一体，一处写齐。**

yq-sanyi（三一，"三位一体"）是一个从零自研的实验性前端框架。组件以单个元素承载模板、行为与作用域样式，无 JSX、无虚拟 DOM、无模板 DSL，**运行时零第三方依赖**，仅用 Web 标准 API，通过普通 `<script>` 标签即可加载运行。

> [English README](./README.md) · [English Tutorial](./docs/tutorial.md) · [中文教程](./docs/tutorial.zh-CN.md)

![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue)
![version](https://img.shields.io/badge/version-v0.1.0-2ea44f)
![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![runtime](https://img.shields.io/badge/runtime-Web%20Standard%20APIs-orange)
![code style](https://img.shields.io/badge/code%20style-Y--4%20no%20comments-8250df)

---

## 为什么选择 yq-sanyi

多数现代框架在你能交付任何东西之前，就要求你接受构建管线、语法方言和虚拟运行时。yq-sanyi 反其道而行：

- **零依赖、零构建**。核心以单一自包含文件交付。删除 `node_modules`，示例依然能跑。
- **一文件一组件**。结构、行为、样式共享同一作用域，无需跨文件切换上下文。
- **静态骨架 + 绑定槽位**。DOM 骨架只解析一次，挂载时克隆；更新只写脏槽。
- **更新可预期**。变更与刷新显式分离：改状态，再调用 `updateComponent`。

## 特性

- **三位一体组件模型** —— 模板、脚本、样式一同定义并作为一个组件挂载。
- **真正的零依赖** —— 仅用 Web 标准 API，依赖图校验进 CI。
- **响应式状态核心** —— 字段级 `state`、记忆化 `derived`、带卸载自动清理的 `effect`。
- **声明式模板** —— 纯 HTML 元素上的文本 `{{ }}`、属性绑定、列表 `yq-for`、条件 `yq-if`。
- **生命周期管理** —— 挂载 / 更新 / 卸载时序有序、清理无泄漏。
- **失败隔离** —— 错误边界把故障组件变成占位符 + 结构化告警，同页其它组件不受影响。
- **调试面板（开发）** —— 不侵入运行时路径即可查看任意运行中组件的状态快照与更新记录。
- **样式作用域与主题** —— 组件样式不泄漏；站点级 CSS 变量可为组件整体换肤。
- **全仓库零注释约定（Y-4）** —— 代码、示例与 docs 代码块均不写注释，检查器进 CI。

## 快速开始

先构建发布产物（core dist 在本地生成，不入库）：

```bash
npm install
npm run build
```

然后启动本地服务，在浏览器打开 `examples/full-demo.html`：

```bash
npm run serve
```

或者在普通 HTML 文件中写第一个组件。加载 IIFE 全局构建，使用 `window.yq` 命名空间：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi 问候</title>
</head>
<body>
  <div id="app"></div>
  <script src="packages/core/dist/core.global.js"></script>
  <script>
    const app = yq.createComponent({
      name: 'greeting',
      container: document.getElementById('app'),
      template: '<p>{{ text }}</p>',
      script: () => ({ state: { text: '你好，yq-sanyi' } })
    });
    yq.mountComponent(app);
  </script>
</body>
</html>
```

偏好 ES 模块？从 `packages/core/dist/core.mjs` 导入同一运行时 —— 下面是一个可交互的计数器：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi 计数器</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { createComponent, mountComponent, updateComponent } from './packages/core/dist/core.mjs';

    const counter = createComponent({
      name: 'counter',
      container: document.getElementById('app'),
      template: `
        <div>
          <h3>{{ title }}</h3>
          <p>计数：{{ count }}</p>
          <button onclick="counterClick()">+1</button>
        </div>
      `,
      script: () => ({
        state: {
          title: '计数器',
          count: 0
        }
      })
    });

    window.counterClick = () => {
      counter.state.count = counter.state.count + 1;
      updateComponent(counter);
    };

    mountComponent(counter);
  </script>
</body>
</html>
```

## 工作原理

1. **解析一次** —— 组件模板被解析为 CDO（骨架树 + 样式文本 + 脚本工厂），动态点预扫描登记为绑定槽表。
2. **克隆与填槽** —— 挂载时克隆静态骨架一次，以状态完成首次填槽。
3. **按需更新** —— `updateComponent` 只重写脏槽，写前比对旧值，单次 flush 原子完成。
4. **干净卸载** —— 卸载时执行 effect 清理并释放全部订阅；反复创建/移除无残留。

## 文档

| 文档 | 内容 |
| --- | --- |
| [English Tutorial](./docs/tutorial.md) | From zero to a working component: template syntax, state, effects, lifecycle |
| [中文教程](./docs/tutorial.zh-CN.md) | 从零到可运行组件：模板语法、状态、副作用与生命周期 |
| [完整示例](./examples/full-demo.html) | 表单、列表、条件渲染与更新集于一页 |

## API 一览

核心运行时从 `dist/core.mjs` 导出以下函数（全局构建中亦为 `window.yq.*`）：

| API | 用途 |
| --- | --- |
| `createComponent(options)` | 由模板与脚本创建组件实例 |
| `mountComponent(instance)` | 将组件挂载到容器 |
| `updateComponent(instance)` | 将状态变更刷写到 DOM |
| `unmountComponent(instance)` | 卸载并释放全部订阅 |
| `state(initial)` / `derived(fn)` / `effect(fn)` | 响应式原语 |
| `define(name, entry)` / `lookup(name)` | 组件注册表 |

## 目录结构

```text
yq-sanyi/
├── packages/core/      核心运行时：解析器、响应式、渲染、组件
├── packages/scoper/    样式作用域改写与主题令牌
├── packages/devtools/  组件树、状态快照与更新日志面板
├── examples/           纯浏览器可运行的示例
├── bench/              性能基准
├── docs/               教程
└── scripts/            构建、服务与 CI 门禁脚本
```

## 开发

```bash
npm run build
npm run test
npm run bench
npm run check:all
npm run ci:all
```

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 打包 core dist（ESM + IIFE 全局） |
| `npm run test` | 运行核心测试套件 |
| `npm run bench` | 运行性能基准 |
| `npm run check:all` | 依赖图 + gzip 预算 + 零注释门禁 |
| `npm run ci:all` | build + typecheck + test + bench + check:all |

发布版本以 tag `v0.1.0` 标识。代码、示例与 docs 代码块必须保持零注释；`npm run check:all` 强制执行。

## 路线图

- v0.1.0 —— 核心运行时、三位一体组件、响应式状态、生命周期、样式作用域、错误边界、调试面板。
- v0.2 —— 加载模型与存量页面的无构建渐进式引入。
- v0.3 —— 性能加固、CI 基准、种子用户验证。

## 许可证

[Apache License 2.0](./LICENSE) © 2026 yq-sanyi contributors
