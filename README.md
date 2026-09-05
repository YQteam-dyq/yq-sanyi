# yq-sanyi

A zero-dependency component framework for the web. One element per component, no build step.

yq-sanyi ("trinity") is an experimental framework written from scratch. A component carries its template, behavior and scoped style in a single element, and runs on Web-standard APIs only — no JSX, no virtual DOM, no third-party runtime.

[简体中文](./README.zh-CN.md) · [English tutorial](./docs/tutorial.md) · [中文教程](./docs/tutorial.zh-CN.md)

![license](https://img.shields.io/badge/license-Apache%202.0-blue)
![version](https://img.shields.io/badge/version-v0.1.0-2ea44f)
![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![build](https://img.shields.io/badge/build-none-orange)

## What is in v0.1.0

- Component API: `createComponent`, `mountComponent`, `updateComponent`, `unmountComponent`, plus a registry with `define` and `lookup`.
- Template: text binding `{{ path }}`, whole-value attribute binding, list rendering `yq-for`, conditional rendering `yq-if`.
- Reactive primitives: `state`, `derived`, `effect` — effects return a cleanup function that runs on unmount.
- Explicit updates: mutate state, then call `updateComponent`.
- Lifecycle: ordered mount / update / unmount, with leak-free disposal of effects and subscriptions.
- Failure isolation: a broken component renders a placeholder and a structured warning; other components on the page keep working.
- Repo convention: no comments in code, examples or docs code fences, enforced by `scripts/check-no-comments.mjs`.

## Quick start

Build the dist bundle, then serve the examples:

```bash
npm install
npm run build
npm run serve
```

Open `examples/full-demo.html` in the browser. Or write your first component in a plain HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi greeting</title>
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
          title: 'Hello yq-sanyi',
          message: 'Zero dependencies, no build.'
        }
      })
    });

    mountComponent(app);
  </script>
</body>
</html>
```

An IIFE global build is also available at `packages/core/dist/core.global.js`; it exposes the same API as `window.yq`.

## Documentation

| Document | Description |
| --- | --- |
| [English tutorial](./docs/tutorial.md) | Template syntax, state, effects and lifecycle from zero |
| [中文教程](./docs/tutorial.zh-CN.md) | 模板语法、状态、副作用与生命周期 |
| [Full demo](./examples/full-demo.html) | Form, list, conditional rendering and updates |

## Development

```bash
npm run build
npm run test
npm run bench
npm run check:all
```

- `npm run build` — bundle `dist/core.mjs` and `dist/core.global.js`
- `npm run test` — run the core test suite
- `npm run bench` — run benchmarks
- `npm run check:all` — dependency graph, gzip budget and no-comments gates

Code, examples and docs code fences stay comment-free; `npm run check:all` enforces it.

## License

Apache License 2.0. Copyright 2026 YQteam-dyq. See [LICENSE](./LICENSE).
