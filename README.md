# yq-sanyi

**Define a component once. Use it as a real HTML tag, anywhere. No build step.**

yq-sanyi ("trinity") is a zero-dependency web component framework written from scratch. Each component carries its template, behavior and scoped style in one definition and turns into a native HTML element. It runs on Web-standard APIs only — no JSX, no virtual DOM, no runtime libraries.

[简体中文](./README.zh-CN.md) · [English tutorial](./docs/tutorial.md) · [中文教程](./docs/tutorial.zh-CN.md)

![license](https://img.shields.io/badge/license-Apache%202.0-blue)
![version](https://img.shields.io/badge/version-v0.1.0-2ea44f)
![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![size](https://img.shields.io/badge/core-8.4%20kB%20gzipped-2ea44f)

## Why yq-sanyi

- **Declarative by design.** `yq.define(...)` once, then drop `<yq-counter>` straight into plain HTML — the tag mounts, renders and cleans itself up. No mounting code per usage.
- **State changes re-render automatically.** Mutate the state object inside a handler and the affected tags update in place; remove the tag from the page and everything is cleaned up.
- **Zero dependencies, zero build for users.** The core is a single ~8.4 kB (gzipped) bundle. It runs on Web-standard APIs only — no JSX, no virtual DOM, no framework runtime.
- **Scoped styles with no leaks.** Styles declared in a component only apply inside that component; theme variables and global styles are managed explicitly.
- **Isolation and failure tolerance.** A broken component renders a placeholder and a structured warning while the rest of the page keeps working.
- **One source of truth.** Template, behavior and style live in one place — one element per component, easy to read and to reuse.

## Quick start

Build the bundle once, then open or write plain HTML files:

```bash
npm install
npm run build
```

The most direct usage is entirely declarative. Save this as `index.html` and open it:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi quick start</title>
</head>
<body>
  <yq-counter></yq-counter>

  <script src="./packages/core/dist/core.global.js"></script>
  <script>
    yq.define('yq-counter', {
      template: '<button yq-on:click="inc">count {{ count }}</button>',
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

Every `<yq-counter>` on the page becomes a live counter. Clicking calls `inc(state)`; the mutation is observed automatically and the tag re-renders. In a module script the same API is available from `./packages/core/dist/core.mjs`, and an imperative API (`createComponent`, `mountComponent`, ...) is exported for programmatic use.

A runnable showcase is in [examples/full-demo.html](./examples/full-demo.html).

## Component tag names

Component tags are native custom elements, so they must follow the HTML custom element rules:

- start with a lowercase letter,
- contain a hyphen (`-`),
- be lowercase only, with `a-z`, digits, `.`, `_` and `-` afterwards.

| Use this | This does not work | Why |
| --- | --- | --- |
| `<yq-counter>` | `<counter>` | no hyphen — the browser would treat it as a plain unknown element |
| `<x-666>` | `<666>` | digits-only names cannot be elements; hyphenate it (`x-666`) |
| `<yq-todo-item>` | `<Todo-Item>` | custom element names must be lowercase |

The parser rejects invalid names at `define` time with a clear error, so a typo never fails silently in the page.

## What is in v0.1.0

- Declarative components: `define` registers a native custom element; tags auto-mount, auto-update and auto-cleanup.
- Template: text binding `{{ path }}`, whole-value attribute binding, boolean attributes, list rendering `yq-for`, event binding `yq-on:event="handler"`.
- Component state: the `script` function returns `{ state, ...handlers }`; handlers receive the reactive state and the event.
- Reactive primitives: `state`, `derived`, `effect` — effects may return a cleanup function.
- Scoped styles, CSS variables theme system, global style registry.
- Lifecycle with ordered mount / update / unmount and leak-free disposal; failure isolation per component.
- Repo convention: no comments in code, examples or docs code fences, enforced by `scripts/check-no-comments.mjs`.

## Documentation

| Document | Description |
| --- | --- |
| [English tutorial](./docs/tutorial.md) | Template syntax, state, effects and lifecycle from zero |
| [中文教程](./docs/tutorial.zh-CN.md) | 模板语法、状态、副作用与生命周期 |
| [Full demo](./examples/full-demo.html) | A runnable showcase of declarative tags, events, lists and state |

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
