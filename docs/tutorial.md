# yq-sanyi Tutorial

Learn yq-sanyi from zero to working components: declarative tags, template syntax, state and handlers, nesting, styling and lifecycle. Every example is a plain HTML file you can save and open.

> 中文版：[中文教程](./tutorial.zh-CN.md)

## Table of contents

1. [What you will build](#what-you-will-build)
2. [Setup](#setup)
3. [Your first component](#your-first-component)
4. [Using the tag anywhere](#using-the-tag-anywhere)
5. [Template syntax](#template-syntax)
6. [State and handlers](#state-and-handlers)
7. [Nested components](#nested-components)
8. [Styling and theming](#styling-and-theming)
9. [Reactive primitives](#reactive-primitives)
10. [Lifecycle and cleanup](#lifecycle-and-cleanup)
11. [Imperative API](#imperative-api)
12. [Troubleshooting](#troubleshooting)
13. [Next steps](#next-steps)

## What you will build

A counter, a user list and a small themed panel. Together they cover every core idea: define once and reuse as a native tag, reactive state with automatic updates, lists with stable keys, nested components, scoped styles and theme variables.

## Setup

The core runtime ships as `packages/core/dist/core.mjs` (ES module) and `packages/core/dist/core.global.js` (IIFE global build). The dist folder is generated locally:

```bash
npm install
npm run build
```

Serve the repository and open the examples in a browser:

```bash
npm run serve
```

You can also create a standalone HTML file and import the runtime from its location in the repo. Adjust the relative path to where your file lives; a file inside `examples/` uses `../packages/core/dist/core.global.js`.

## Your first component

Define a component once, then use it as a tag. Save this as `counter.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>yq-sanyi counter</title>
</head>
<body>
  <yq-counter></yq-counter>

  <script src="./packages/core/dist/core.global.js"></script>
  <script>
    yq.define('yq-counter', {
      template: '<button yq-on:click="inc">count {{ count }}</button>',
      style: 'button { font-size: 18px; padding: 8px 18px; cursor: pointer; }',
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

Three parts, one definition:

- `template` is standard HTML with `{{ path }}` placeholders and `yq-on:*` event bindings.
- `style` is standard CSS. It is scoped: it only applies to elements inside this component.
- `script` is a plain function. It returns the initial `state` plus event handlers such as `inc`.

Click the button: `inc` receives the reactive state, mutates it, and the tag re-renders in place. You never touch the DOM manually.

## Using the tag anywhere

Once registered, the tag is a normal custom element. Put as many instances as you like in the same page, in other components, or even in later HTML you inject — each instance mounts, renders and cleans itself up:

```html
<body>
  <yq-counter></yq-counter>
  <yq-counter></yq-counter>

  <script src="./packages/core/dist/core.global.js"></script>
  <script>
    yq.define('yq-counter', {
      template: '<button yq-on:click="inc">count {{ count }}</button>',
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
```

Tag names follow the custom element rules: start with a lowercase letter, contain a hyphen, and stay lowercase. `yq-counter` is valid; `counter` and `Counter` are not, and `define` rejects invalid names with a clear error.

## Template syntax

### Text binding

`{{ path }}` writes a state value. Paths are dot-separated: `{{ user.name }}`.

```html
<div>{{ greeting }}, {{ user.name }}</div>
```

### Attribute binding

An attribute whose whole value is one placeholder is bound to state and written back on every update.

```html
<input value="{{ inputValue }}" placeholder="{{ placeholder }}">
```

### List rendering

Add `yq-for="item in items"` to a container element. The framework renders one copy per item and keeps the rows in sync with the list.

```html
<ul>
  <li yq-for="user in users" yq-key="id">{{ user.name }} - {{ user.role }}</li>
</ul>
```

`yq-key` names the per-item stable field. Rows are matched by key and reused instead of being rebuilt, which keeps stateful content and minimizes DOM writes. A keyed row should not be nested inside another `yq-for` — render the inner list through a child component instead.

Write `yq-for="(item, index) in items"` when a row needs its position in the list:

```html
<ul>
  <li yq-for="(user, position) in users" yq-key="id">{{ position }}. {{ user.name }}</li>
</ul>
```

### Event binding

`yq-on:event="handler"` binds an event on an element to a handler returned by `script`.

```html
<button yq-on:click="save">save</button>
```

```html
<script>
  yq.define('yq-form', {
    template: '<button yq-on:click="save">save</button><span>{{ status }}</span>',
    script: function () {
      return {
        state: { status: 'idle' },
        save: function (state, event) {
          state.status = 'saved'
        }
      }
    }
  })
</script>
```

Handlers receive the reactive state and the native event. Because updates are batched, several state writes inside one handler render exactly once.

Events also work inside a `yq-for` row. Each row gets its own scope, so a handler can read the row item directly from `state`:

```html
<script>
  yq.define('yq-task-list', {
    template: '<div><div yq-for="task in tasks" yq-key="id">{{ task.text }} <button yq-on:click="remove">x</button></div></div>',
    script: function () {
      return {
        state: { tasks: [] },
        remove: function (state, event) {
          state.tasks = state.tasks.filter(function (task) { return task.id !== state.task.id })
        }
      }
    }
  })
</script>
```

Inside a row, `state` is a thin overlay on the component state: reads resolve the row item first and fall back to the component scope, and writes go through to the component state so they stay reactive and batched. Listeners are rebound when a row is recycled and dropped with the row itself, so removing items never leaks handlers.

## State and handlers

`script` returns `{ state, ...handlers }`. `state` is the reactive data the template reads; every other function becomes a handler callable from `yq-on:*`.

```html
<script>
  yq.define('yq-todo', {
    template: `
      <input value="{{ draft }}">
      <button yq-on:click="add">add</button>
      <ul>
        <li yq-for="todo in todos" yq-key="id">{{ todo.text }}</li>
      </ul>
    `,
    script: function () {
      return {
        state: { draft: '', todos: [] },
        add: function (state) {
          if (state.draft.trim().length === 0) return
          state.todos.push({ id: state.todos.length + 1, text: state.draft })
          state.draft = ''
        }
      }
    }
  })
</script>
```

Use `<yq-todo></yq-todo>` anywhere. Pushing to `todos` re-renders only the list; clearing `draft` clears the input. All writes in `add` flush in one synchronous render.

## Nested components

Registered tags can be used inside another component's template. When a parent renders, its children mount automatically; when the parent's element is removed from the page, the children unmount and release their listeners too.

```html
<script>
  yq.define('yq-list-item', {
    template: '<li>{{ label }}</li>',
    script: function () {
      return { state: { label: 'item' } }
    }
  })

  yq.define('yq-list', {
    template: '<ul><yq-list-item></yq-list-item></ul>',
    script: function () {
      return { state: {} }
    }
  })
</script>
```

## Styling and theming

The `style` field is rewritten so its selectors only match inside the component's own subtree. Two instances of the same component share a single style injection, and the style is removed once the last instance is gone.

```html
<script>
  yq.define('yq-panel', {
    template: '<div class="panel"><h3>{{ title }}</h3><p class="hint">{{ hint }}</p></div>',
    style: `
      .panel { border: 1px solid var(--yq-border-color, #ddd); border-radius: 8px; padding: 16px; }
      .hint { color: var(--yq-text-muted, #666); }
    `,
    script: function () {
      return {
        state: { title: 'panel', hint: 'theme-aware hint' }
      }
    }
  })
</script>
```

Components read theme variables with CSS fallbacks. Swap a theme for the whole page through the scoper:

```html
<script>
  yq.scoper.updateTheme({
    'border-color': '#2563eb',
    'text-muted': '#1e40af'
  })
</script>
```

Page-level global styles are registered explicitly with `yq.scoper.addGlobalStyle(css, id)` and removed with `removeGlobalStyle(id)`. By default styling relies on scope rewriting, which keeps CSS variables and inheritance working as usual. Shadow DOM is available per component through `createScopedElement(..., { useShadowDOM: true })` when you need hard encapsulation.

## Reactive primitives

Components manage their own state automatically. For state shared outside a component, the core also exports `state`, `derived` and `effect` primitives with dependency tracking:

```html
<script>
  const count = yq.state(0)
  const doubled = yq.derived(function () { return count.value * 2 })

  yq.effect(function () {
    document.getElementById('double').textContent = doubled.value
  })

  yq.define('yq-bump', {
    template: '<button yq-on:click="bump">+1</button>',
    script: function () {
      return {
        state: {},
        bump: function () {
          count.value = count.value + 1
        }
      }
    }
  })
</script>
```

`state(x)` returns a box read through `.value`. `derived` recomputes only when its dependencies change. `effect` re-runs whenever a dependency changes and may return a cleanup function that runs before the next run and when the effect is disposed.

## Lifecycle and cleanup

A component element has a full lifecycle managed by the runtime:

- Appending the tag to a connected document mounts it: the skeleton is built, slots are filled and handlers are bound.
- Updating state refreshes only the bound parts.
- Removing the tag unmounts it: listeners and subscriptions are disposed, and the shared style is released when the last instance unmounts.

Remove a component element from the page and its state, DOM and listeners are gone with it:

```html
<script>
  const list = document.getElementById('board')
  const panel = document.createElement('yq-panel')
  list.appendChild(panel)
  panel.remove()
</script>
```

`panel.remove()` triggers the unmount path for that instance — nothing else is required and no per-usage teardown code is needed. For components created through the imperative API, register effect cleanups on the instance and unmounting runs them automatically (see the next section).

## Imperative API

The declarative path is the primary one, but the runtime also exports an imperative API for programmatic mounting: `createComponent`, `mountComponent`, `updateComponent` and `unmountComponent`, plus `effect` and `setLifecycleHooks` for wiring side effects and observing the lifecycle:

```html
<script type="module">
  import { createComponent, mountComponent, effect, setLifecycleHooks, unmountComponent } from './packages/core/dist/core.mjs';

  const widget = createComponent({
    name: 'yq-widget',
    template: '<b>{{ label }}</b>',
    script: function () {
      return { state: { label: 'hello from code' } }
    }
  });

  setLifecycleHooks(widget, {
    onMount: function () { console.log('mounted') },
    onUnmount: function () { console.log('unmounted') }
  });

  effect(function () {
    const timer = setInterval(() => { console.log('tick') }, 1000);
    return function () { clearInterval(timer) };
  });

  mountComponent(widget);
  unmountComponent(widget);
</script>
```

`setLifecycleHooks` observes the ordered mount / update / unmount phases. `effect` returns a cleanup function, and `unmountComponent` runs every registered cleanup before tearing the component down, so repeated create/remove cycles leave no residue.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Nothing renders | The runtime path is wrong, or the tag name in HTML differs from the one passed to `define`. Use the same lowercase hyphenated name. |
| Placeholder text like `{{ count }}` stays visible | The state path does not match a key returned by `script`. Paths are dot-separated: `{{ user.name }}`. |
| Clicking a button does nothing | The handler name in `yq-on:click` is not one of the functions returned by `script`, or the name is misspelled. |
| List rows do not react | Rows are keyed by `yq-key`; give each item a stable unique id. Event bindings do not work inside `yq-for` rows — call a state-changing handler from a static part of the component instead. |
| Styles leak or do not apply | Styles written in the component `style` field are scoped automatically. Page-level rules must be added via `yq.scoper.addGlobalStyle`. |
| A component crashes | The error boundary renders a placeholder and logs a structured warning; other components on the page keep working. |
| Only one update happens for several writes | That is by design. Writes inside one synchronous task are batched into a single refresh. |

## Next steps

- Browse the [features and API overview](../README.md).
- Open `examples/full-demo.html` for a one-page showcase of tags, events, lists and state.
- Browse [examples/list-row-events.html](../examples/list-row-events.html) for row handlers, row indexes and keyed reconciliation.
- Read the Chinese version of this tutorial: [中文教程](./tutorial.zh-CN.md).
