# yq-sanyi

**Define a component once. Use it as a real HTML tag, anywhere. No build step.**

yq-sanyi ("trinity") is a zero-dependency web component framework written from scratch. A component carries its template, behavior and scoped style in one definition — the three parts share one scope, one reactive state and one lifecycle — and becomes a native HTML element you drop straight into any page.

[简体中文](./README.zh-CN.md) · [English tutorial](./docs/tutorial.md) · [中文教程](./docs/tutorial.zh-CN.md)

![license](https://img.shields.io/badge/license-Apache%202.0-blue)
![version](https://img.shields.io/badge/version-v0.1.0-2ea44f)
![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)
![size](https://img.shields.io/badge/core-8.5%20kB%20gzipped-2ea44f)

## Why yq-sanyi

- **Declarative by design.** Call `yq.define(...)` once, then write `<yq-counter>` in plain HTML — the tag mounts, renders and cleans itself up. No mounting code per usage, no framework tag.
- **State changes re-render automatically.** Mutate the state object inside a handler and the affected parts update in place; remove the tag from the page and every subscription, listener and style is released.
- **Zero dependencies, zero build for users.** The core is a single ~8.5 kB (gzipped) bundle. It runs on Web-standard APIs only — no JSX, no virtual DOM, no framework runtime, no compiler.
- **Scoped styles with no leaks.** Styles declared in a component only apply inside that component. Theme variables and global styles are managed explicitly, and one style is shared by all instances of the same component.
- **Failure isolation.** A broken component renders an error placeholder and a structured warning while the rest of the page keeps working.
- **One source of truth.** Template, behavior and style live in one unit — a component is easy to read, easy to reuse and easy to audit.

## How a component is defined

```js
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
```

The template is standard HTML, the style is standard CSS, the script is standard JS. The `script` function returns the component state plus event handlers; handlers receive the reactive state object, so a mutation is observed and re-rendered for you. Custom elements already registered this way can be nested inside other templates like any other tag.

## Quick start

Build the bundle once, then open or write plain HTML files:

```bash
npm install
npm run build
```

Save this as `index.html` and open it in a browser:

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

Every `<yq-counter>` on the page becomes a live counter. In a module script the same API is available from `./packages/core/dist/core.mjs`; an imperative API (`createComponent`, `mountComponent`, ...) is exported for programmatic use.

A runnable showcase is in [examples/full-demo.html](./examples/full-demo.html).

## Component tag names

Component tags are native custom elements, so they follow the HTML custom element rules:

- start with a lowercase letter,
- contain a hyphen (`-`),
- use lowercase `a-z`, digits, `.`, `_` and `-` afterwards.

| Use this | This does not work | Why |
| --- | --- | --- |
| `<yq-counter>` | `<counter>` | no hyphen — the browser treats it as a plain unknown element |
| `<x-666>` | `<666>` | digits-only names cannot be elements; hyphenate it (`x-666`) |
| `<yq-todo-item>` | `<Todo-Item>` | custom element names must be lowercase |

`define` rejects invalid names with a clear error, so a typo never fails silently in the page.

## What is in v0.1.0

- **Declarative components.** `define` registers a native custom element; tags auto-mount, auto-update and auto-cleanup.
- **Template.** Text binding `{{ path }}`, whole-value attribute binding, boolean attributes, list rendering `yq-for` with stable `yq-key`, event binding `yq-on:event="handler"`.
- **State and handlers.** The `script` function returns `{ state, ...handlers }`; writes inside one synchronous task are batched into a single refresh.
- **Reactive primitives.** `state`, `derived`, `effect` — derived values cache until their dependencies change, effects may return a cleanup function and are disposed with the component.
- **Rendering.** Static skeleton is cloned once and updates write only the bound slots — no subtree rebuilds, no virtual DOM.
- **Scoped styles.** Scope rewriting with no Shadow DOM required, CSS variable theming, shared single injection per component, global style registry.
- **Lifecycle.** Ordered mount / update / unmount with leak-free disposal; nested components clean up when their host is removed.
- **Debug hooks.** Component tree, state snapshots and update logs are readable through lifecycle hooks; a separate devtools package is available.
- **Repo convention.** No comments in code, examples or docs code fences, enforced by `scripts/check-no-comments.mjs`.

## API at a glance

| API | Purpose |
| --- | --- |
| `yq.define(name, { template, style, script })` | register a component as a custom element |
| `yq.lookup(name)` | resolve a registered definition |
| `state(initial)` / `derived(fn)` / `effect(fn)` | reactive primitives with dependency tracking |
| `createComponent`, `mountComponent`, `updateComponent`, `unmountComponent` | imperative lifecycle control |
| `setLifecycleHooks`, `getComponentTree`, `getUpdateLogs`, `getStateSnapshot` | lifecycle hooks and debug reads |
| `withErrorBoundary`, `resetErrorBoundary` | per-component error boundaries |
| `yq.scoper` | scoped styles, theming and global style registry |

The ESM entry is `packages/core/dist/core.mjs`; the global build is `packages/core/dist/core.global.js` (exposed as `window.yq`).

## Examples

| Example | Shows |
| --- | --- |
| [basic.html](./examples/basic.html) | smallest declarative component, single script tag |
| [full-demo.html](./examples/full-demo.html) | declarative tags, events, lists and state on one page |
| [parse-demo.html](./examples/parse-demo.html) | template parsing walk-through |
| [reactive-demo.html](./examples/reactive-demo.html) | `state` / `derived` / `effect` primitives |
| [csp-test.html](./examples/csp-test.html) | behavior-script execution under a strict CSP |

## Known limitations

- **Events inside `yq-for` rows.** `yq-on:*` cannot be bound to elements generated by a list row; place the handler on a static part of the component or delegate from a container. This is tracked for a future release.
- **Shadow DOM is opt-in.** Style isolation uses scope rewriting by default; `createScopedElement` accepts `useShadowDOM` when strong encapsulation is needed.
- **v0.1.0 is browser-runtime only.** No SSR, no CLI, no non-browser targets. All are deliberate non-goals for the first release.

## Documentation

| Document | Description |
| --- | --- |
| [English tutorial](./docs/tutorial.md) | Template syntax, state, effects and lifecycle from zero |
| [中文教程](./docs/tutorial.zh-CN.md) | 模板语法、状态、副作用与生命周期 |

## Repository layout

```
packages/core/src      core runtime: registry, parser, reactive, render, scoper, lifecycle
packages/core/dist     built bundles (core.mjs, core.global.js)
packages/core/test     node:test assertion suite
packages/devtools      optional debug panel (separate bundle)
examples/              runnable HTML demos
docs/                  tutorials and decision records
scripts/               repo gates: deps, gzip budget, no-comments
```

## Development

```bash
npm run build
npm run test
npm run bench
npm run check:all
```

- `npm run build` — bundle `dist/core.mjs` and `dist/core.global.js`
- `npm run test` — run the core test suite
- `npm run bench` — run benchmarks against the §7.4 budget
- `npm run check:all` — dependency graph, gzip budget and no-comments gates

Code, examples and docs code fences stay comment-free; `npm run check:all` enforces it.

## License

Apache License 2.0. Copyright 2026 YQteam-dyq. See [LICENSE](./LICENSE).
