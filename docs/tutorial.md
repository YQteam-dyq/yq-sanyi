# yq-sanyi Tutorial

Learn yq-sanyi from zero to a working component: setup, template syntax, reactive state, effects and lifecycle. Everything here follows the repo-wide no-comment rule, so every code sample is comment-free on purpose.

> 中文版：[中文教程](./tutorial.zh-CN.md)

## Table of contents

1. [What you will build](#what-you-will-build)
2. [Setup](#setup)
3. [Your first component](#your-first-component)
4. [Template syntax](#template-syntax)
5. [State, derived values and effects](#state-derived-values-and-effects)
6. [Events and updates](#events-and-updates)
7. [Lifecycle and cleanup](#lifecycle-and-cleanup)
8. [Troubleshooting](#troubleshooting)
9. [Next steps](#next-steps)

## What you will build

A small counter page, then a user list, then a form. Together they exercise every core idea of the framework: one-file components, declarative templates, reactive state, derived values, effects with automatic cleanup, and explicit updates.

## Setup

The core runtime is bundled into `packages/core/dist/core.mjs` (ES module) and `packages/core/dist/core.global.js` (IIFE global build). The dist folder is generated locally:

```bash
npm install
npm run build
```

Serve the repository and open the examples in a browser:

```bash
npm run serve
```

You can also create a standalone HTML file and import the runtime from its location in the repo. Adjust the relative import path to match where your file lives; a file at the repo root uses `./packages/core/dist/core.mjs`, a file inside `examples/` uses `../packages/core/dist/core.mjs`.

## Your first component

A component is a single object: a template string, a script that returns state, and a container to mount into.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>my first yq-sanyi component</title>
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
          title: 'Hello yq-sanyi',
          message: 'A zero-dependency web framework.'
        }
      })
    });

    mountComponent(greeting);
  </script>
</body>
</html>
```

Run it and you see the two lines rendered. Two things happened:

1. `createComponent` parsed the template once and registered the dynamic points as binding slots.
2. `mountComponent` cloned the static skeleton and filled the slots from state.

The template is plain HTML with `{{ path }}` placeholders; state values are read with dot paths such as `user.name`.

## Template syntax

### Text binding

```html
<div>{{ message }}</div>
```

### Attribute binding

An attribute whose whole value is a placeholder gets bound to state. The value is written back on every update.

```html
<input value="{{ inputValue }}">
```

### List rendering

Add `yq-for="item in items"` to a container element. The framework renders one copy per list item and updates it when the list changes.

```html
<ul>
  <li yq-for="user in users">{{ user.name }}</li>
</ul>
```

### Conditional rendering

Add `yq-if="condition"` to an element to render it only while the state path is truthy.

```html
<div yq-if="isVip">VIP member</div>
```

### Two-way style form field

`yq-model="path"` binds an input field to state.

```html
<input type="text" yq-model="formData.name">
```

## State, derived values and effects

The script function returns three optional sections: `state`, `derived` and `effect`.

- `state` holds plain reactive fields, read by the template with `{{ }}`.
- `derived` recomputes memoized values only when their dependencies change.
- `effect` runs once after mount and may return a cleanup function that runs on unmount.

```javascript
const counter = createComponent({
  name: 'counter',
  container: document.getElementById('app'),
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <p>Double: {{ double }}</p>
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
      console.log('counter mounted');
      return () => {
        console.log('counter unmounted');
      };
    }
  })
});
```

## Events and updates

Inline handlers call functions that you attach to `window`. Mutating state never renders by itself; call `updateComponent` to flush the new state into the DOM. This keeps updates explicit and predictable.

```javascript
window.bump = () => {
  counter.state.count = counter.state.count + 1;
  updateComponent(counter);
};

mountComponent(counter);
```

The full flow for the counter above: click calls `bump`, state changes, `updateComponent` rewrites only the dirty slots, and the `double` derived value recomputes because its dependency changed.

## Lifecycle and cleanup

Unmounting disposes everything the component registered — effects, derived subscriptions and DOM nodes — so repeated create/remove cycles leave no residue.

```javascript
mountComponent(counter);

setTimeout(() => {
  unmountComponent(counter);
  console.log('counter removed');
}, 5000);
```

If your effect started an interval, a subscription or a fetch, return a cleanup function from the effect and it will be called during unmount automatically. This is the mechanism that prevents memory leaks.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Nothing renders | The container element does not exist or the runtime path is wrong. Check `document.getElementById` and the import path. |
| Placeholder text still visible | The state path in `{{ }}` does not match a state field. Paths are dot separated, for example `{{ user.name }}`. |
| Clicking a button does nothing | The handler is not attached to `window`, or state changed without calling `updateComponent`. |
| An attribute binding throws | Only whole-value attribute bindings are supported; partial values such as `class="{{ a }} {{ b }}"` are rejected by design. |
| A component fails to parse | The error boundary shows a placeholder and logs a structured warning; other components on the page keep working. |

## Next steps

- Read the [API surface](../README.md#api-surface) in the README.
- Open the full demo at `examples/full-demo.html` for forms, lists and conditional rendering together.
- Read the Chinese version of this tutorial: [中文教程](./tutorial.zh-CN.md).
