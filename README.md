# yq-sanyi 三一

**A zero-dependency, no-build web framework that keeps component structure, behavior and style in one place.**

yq-sanyi (三一, "trinity") is a from-scratch experimental front-end framework. A component is authored as a single element that carries its template, behavior and scoped style together — no JSX, no virtual DOM, no template DSL, and **zero runtime dependencies**. It loads from a plain `<script>` tag and runs on Web-standard APIs only.

> [简体中文版 README](./README.zh-CN.md) · [English Tutorial](./docs/tutorial.md) · [中文教程](./docs/tutorial.zh-CN.md)

![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue)
![version](https://img.shields.io/badge/version-v0.1.0-2ea44f)
![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![runtime](https://img.shields.io/badge/runtime-Web%20Standard%20APIs-orange)
![code style](https://img.shields.io/badge/code%20style-Y--4%20no%20comments-8250df)

---

## Why yq-sanyi

Most modern frameworks ask you to adopt a build pipeline, a syntax dialect and a virtual runtime before you can ship anything. yq-sanyi goes the other way:

- **Zero dependencies, zero build.** The core ships as one self-contained file. Delete `node_modules` and the demos still run.
- **One file per component.** Structure, behavior and style share one scope — no cross-file context switching.
- **Static skeleton + binding slots.** The DOM skeleton is parsed once and cloned on mount; updates touch only dirty slots.
- **Predictable updates.** Mutation and refresh are explicit: change state, then call `updateComponent`.

## Features

- **Trinity component model** — template, script and style defined together and mounted as one component.
- **True zero dependency** — only Web-standard APIs, enforced by a dependency-graph check.
- **Reactive state core** — field-level `state`, memoized `derived`, and `effect` with auto cleanup on unmount.
- **Declarative template** — text `{{ }}`, attribute binding, list `yq-for`, conditional `yq-if` on plain HTML elements.
- **Lifecycle management** — mount / update / unmount with ordered hooks and leak-free disposal.
- **Failure isolation** — an error boundary turns a broken component into a placeholder plus a structured warning; the rest of the page keeps working.
- **Debug panel (dev)** — inspect any running component's state snapshot and recent update log without touching the runtime path.
- **Scoped styles & themes** — component styles never leak; site-level CSS variables can re-theme components.
- **Repo-wide no-comment rule (Y-4)** — code, examples and docs code fences stay comment-free; a checker runs in CI.

## Quick start

Build the release artifact first (the core dist is generated locally, not committed):

```bash
npm install
npm run build
```

Then serve the repo and open `examples/full-demo.html` in a browser:

```bash
npm run serve
```

Or write your first component in a plain HTML file. Load the IIFE global build and use the `window.yq` namespace:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi greeting</title>
</head>
<body>
  <div id="app"></div>
  <script src="packages/core/dist/core.global.js"></script>
  <script>
    const app = yq.createComponent({
      name: 'greeting',
      container: document.getElementById('app'),
      template: '<p>{{ text }}</p>',
      script: () => ({ state: { text: 'hello yq-sanyi' } })
    });
    yq.mountComponent(app);
  </script>
</body>
</html>
```

Prefer ES modules? Import the same runtime from `packages/core/dist/core.mjs` — here is an interactive counter:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi counter</title>
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
          <p>Count: {{ count }}</p>
          <button onclick="counterClick()">+1</button>
        </div>
      `,
      script: () => ({
        state: {
          title: 'Counter',
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

## How it works

1. **Parse once** — a component template is parsed into a CDO (skeleton tree + style text + script factory) and its dynamic points are pre-scanned into binding slots.
2. **Clone and fill** — mounting clones the static skeleton once and fills the slots with state for the first paint.
3. **Update on demand** — `updateComponent` rewrites only dirty slots, comparing old values before writing, and completes each flush atomically.
4. **Dispose cleanly** — unmounting runs effect cleanup and releases every subscription; no residue after repeated create/remove cycles.

## Documentation

| Guide | What you will learn |
| --- | --- |
| [English Tutorial](./docs/tutorial.md) | From zero to a working component: template syntax, state, effects, lifecycle |
| [中文教程](./docs/tutorial.zh-CN.md) | 从零到可运行组件：模板语法、状态、副作用与生命周期 |
| [Full demo](./examples/full-demo.html) | Form, list, conditional rendering and updates in one page |

## API surface

The core runtime exports these functions from `dist/core.mjs` (also available as `window.yq.*` from the global build):

| API | Purpose |
| --- | --- |
| `createComponent(options)` | Create a component instance from a template and script |
| `mountComponent(instance)` | Mount a component into its container |
| `updateComponent(instance)` | Flush state changes to the DOM |
| `unmountComponent(instance)` | Unmount and dispose all subscriptions |
| `state(initial)` / `derived(fn)` / `effect(fn)` | Reactive primitives |
| `define(name, entry)` / `lookup(name)` | Component registry |

## Project layout

```text
yq-sanyi/
├── packages/core/      Core runtime: parser, reactive, render, component
├── packages/scoper/    Scoped CSS rewrite and theme tokens
├── packages/devtools/  Component tree, state snapshot and update log panel
├── examples/           Runnable demos for a plain browser
├── bench/              Performance benchmarks
├── docs/               Tutorials
└── scripts/            Build, serve and CI gate scripts
```

## Development

```bash
npm run build
npm run test
npm run bench
npm run check:all
npm run ci:all
```

| Command | What it does |
| --- | --- |
| `npm run build` | Bundle the core dist (ESM + IIFE global) |
| `npm run test` | Run the core test suite |
| `npm run bench` | Run performance benchmarks |
| `npm run check:all` | Dependency graph + gzip budget + no-comments gates |
| `npm run ci:all` | build + typecheck + test + bench + check:all |

The release is tagged `v0.1.0`. Code, examples and docs code fences must stay comment-free; `npm run check:all` enforces it.

## Roadmap

- v0.1.0 — core runtime, trinity components, reactive state, lifecycle, scoping, error boundary, debug panel.
- v0.2 — loader model and no-build incremental adoption in existing pages.
- v0.3 — performance hardening, benchmarks in CI, seed-user validation.

## License

[Apache License 2.0](./LICENSE) © 2026 yq-sanyi contributors
