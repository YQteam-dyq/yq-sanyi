# yq-sanyi（三一）

> HTML · CSS · JS — one component, zero dependencies.
>
> 零依赖 HTML/CSS/JS 三位一体前端框架：模板、样式与行为收敛进同一个组件描述，只站在 Web 标准 API 之上。

## What is it

**yq-sanyi（三一）is a zero-dependency, HTML/CSS/JS trinity front-end framework.** A component is written once — template, script and styles together — and runs directly in the browser on plain Web standards. No bundler, no virtual-DOM library, no third-party runtime. The Chinese name 三一（sān yī, "three in one"）means exactly that: 三位一体。

## Core features

- **Zero-dependency runtime** — 运行时零第三方依赖，只用原生 JS + DOM 等 Web 标准 API。
- **Trinity authoring** — HTML/CSS/JS 三合一：一个组件 = 声明式模板 + 响应式脚本 + 作用域样式。
- **Static skeleton + binding slots** — 静态骨架 + 绑定槽位：模板只解析一次，更新时复用静态 DOM，减少操作与回流。
- **Reactive state** — 内置 `state` / `derived` / `effect`，自动依赖追踪与批量更新，附 `updateComponent` 手动刷新。
- **Declarative template syntax** — `{{ }}` 文本插值、属性与布尔属性绑定、`yq-for` 列表渲染、`yq-if` 条件渲染、`yq-model` 双向绑定。
- **Scoped styles** — `packages/scoper` 提供样式隔离（数据属性作用域 / Shadow DOM）、主题变量与全局样式管理。
- **Modular monorepo** — `packages/core`（核心运行时）、`packages/scoper`（样式作用域）、`packages/devtools`（调试面板），可整体或按模块使用。
- **Comment-free by convention** — 仓库约定：全部源码与示例（含文档代码块）不写任何注释，行为由自说明命名与文档承载，由 CI 强制校验。
- **CI guardrails** — 依赖图校验、core gzip 体积钩子、注释检测（`scripts/check-*.mjs`）全部并入 CI。

## Minimal example

A whole page in one file — save it at the repository root next to `packages/`, open it in a browser. No install, no build step:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>yq-sanyi hello</title>
</head>
<body>
<div id="app"></div>
<script src="packages/core/dist/core.global.js"></script>
<script>
const component = window.yq.createComponent({
  name: 'hello-world',
  template: '<div><h1>{{ title }}</h1><p>{{ message }}</p></div>',
  script: () => ({
    state: {
      title: 'yq-sanyi',
      message: 'zero-dependency trinity web framework'
    }
  }),
  container: document.getElementById('app')
});
window.yq.mountComponent(component);
</script>
</body>
</html>
```

中文要点：`packages/core/dist/core.global.js` 是 IIFE 全局产物，加载后通过 `window.yq` 暴露全部 API；`createComponent` 声明组件（`template` 模板 + `script` 返回初始状态），`mountComponent` 完成挂载，模板里的 `{{ }}` 自动绑定响应式状态。

## Quick start

Clone the repository and install the dev toolchain:

```bash
git clone https://github.com/OWNER/yq-sanyi.git
cd yq-sanyi
npm install
```

Run the local example server:

```bash
npm run serve
```

Then open the printed URL and browse the ready-to-open pages under `examples/`（含全链路演示 `examples/full-demo.html`）。

Key npm scripts:

| Script | Description |
| --- | --- |
| `npm run build` | bundle core into ESM `packages/core/dist/core.mjs` and IIFE `core.global.js`（暴露 `window.yq`） |
| `npm run typecheck` | run `tsc --noEmit` |
| `npm run test` | run automated test suites with `node --test` |
| `npm run bench` | run performance benchmarks（首屏 / 更新延迟 / 帧率） |
| `npm run check:all` | dependency-graph + gzip-size + no-comments CI checks |
| `npm run ci:all` | build + typecheck + test + bench + all checks |

Note on zero dependency: the framework runtime itself has no install step — the built artifacts are plain browser files. Deleting `node_modules` does not affect the core bundles or example pages（G-1 基线）.

Browser support: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+（现代浏览器即开即用，无需 polyfill）。

## Documentation

| Entry | Content |
| --- | --- |
| [GETTING-STARTED.md](GETTING-STARTED.md) | 快速开始指南：基础用法、列表/条件渲染、响应式更新、表单处理、模板语法与完整 API 清单 |
| [docs/index.md](docs/index.md) | monorepo 总览、工程规范与 npm scripts |
| [docs/spec/grammar.md](docs/spec/grammar.md) | 模板语法规范 |
| [docs/spec/reactive-api.md](docs/spec/reactive-api.md) | 响应式 API 规范（state / derived / effect） |
| [docs/full-demo-documentation.md](docs/full-demo-documentation.md) | 全链路演示说明 |
| [examples/](examples/) | 可直接打开的 HTML 示例（含 `full-demo.html` 全链路演示、`basic.html` 最小注册表示例） |

## License

Apache-2.0 — see [LICENSE](LICENSE).
