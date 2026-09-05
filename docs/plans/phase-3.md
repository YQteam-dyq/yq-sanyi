# Phase 3 详细策划案 · 自研响应式核心（yq-sanyi）

对应：`/workspace/.trae/specs/yq-sanyi/spec.md` §6.3、tasks.md Ph3-T1/T2/T3、checklist.md Phase 3。
本策划案在派发前已将**设计决策全部锁死**：实施者按本文档逐步执行，禁止自行设计、自行扩缩范围、禁止上网搜索。

## 1. 目标与本阶段边界

- 做：自研响应式原语 `state()` / `derived()` / `effect()`；字段级依赖追踪；批处理 + 写合并；派生缓存；实例级 dispose；脱离 DOM 的完整单测。
- 不做（后续 Phase 负责，本阶段禁止引入）：
  - 不做任何 DOM 渲染/挂载/更新（Phase 4）；不做生命周期（Phase 6）；不做样式作用域（Phase 5）；不做 parser（Phase 2 已完成）。
  - 不依赖任何第三方（运行时与 devDependencies 保持现状：devDeps 仅 typescript + esbuild）。
  - 所有新建/修改的源码、脚本、HTML、docs 代码围栏内**不得出现任何注释**（Y-4）。写代码时不得在正则字面量内写 `//` 形态，字符串内 URL 写法必须带引号。
  - 不新增任何 npm scripts（Phase 4/5/6/7 各自负责各自脚本）。

## 2. 已锁定的设计决策（R-3 响应式语义）

### 2.1 API 形态（纯函数、无 DOM API）

```ts
const count = state(0);
const doubled = derived(() => count.value * 2);

effect(() => {
  console.log(`Count: ${count.value}, Doubled: ${doubled.value}`);
});

count.dispose();
```

示例分三步：先声明 `count` 状态与派生值 `doubled`；再声明副作用打印二者；最后手动清理（如组件卸载时调用 `count.dispose()`）。

- `state<T>(initial: T): State<T>` — 可变状态对象（`.value` 读写）
- `derived<T>(fn: () => T): Derived<T>` — 派生状态（自动追踪依赖）
- `effect(fn: () => void): () => void` — 副作用（返回 cleanup 函数）
- `State<T>` 接口：`{ value: T }` + `dispose()`（移除自身所有依赖关系）
- `Derived<T>` 接口：继承 `State<T>`，额外有 `dependencies: State[]`（调试用）
- `effect` 返回 cleanup 函数：调用后移除该 effect 的所有订阅关系

### 2.2 依赖追踪机制（写时标脏、读时登记）

- **读时登记**：当访问 `state.value` 或 `derived.value` 时，记录当前 effect 的依赖关系（effect 栈顶）。
- **写时标脏**：当修改 `state.value` 时，标记该 state 为 dirty；检查所有依赖该 state 的 derived，标记为 dirty。
- **惰性计算**：derived 在 `.value` 被访问时才计算，且只计算 dirty 的 derived。
- **循环依赖检测**：如果 effect 中修改了 state，该 state 又被同一 effect 依赖，抛 `Error: Circular dependency detected`。

### 2.3 批处理与调度（R-3 核心要求）

- **批处理**：同一同步任务内多次对同一 state 写入，只触发一次 flush。
- **写合并**：同字段连续写，只保留最后一次值（如 `count.value = 1; count.value = 2;` → flush 时值为 2）。
- **flush 时机**：所有 state 写操作完成后，将 dirty 集合挂微任务队尾（`queueMicrotask`），不追帧。
- **原子性**：一次 flush 内完成所有 dirty derived 的计算和 effect 触发，无中间态。

### 2.4 调试与开发支持（Phase 6 接入）

- 暴露全局调试对象 `yq.reactive`（可选，Phase 6 devtools 面板消费）：
  ```ts
  yq.reactive = {
    states: State[],
    effects: Effect[],
    dump: () => { /* 返回当前状态快照 */ }
  };
  ```
- Phase 6 负责将此对象接 devtools 面板；本阶段只提供基础 API。

## 3. 公共 API 与 TypeScript 类型（新增于 packages/core/src）

新文件 `packages/core/src/reactive.ts`，导出：

```ts
export interface State<T> {
  value: T;
  dispose(): void;
}

export interface Derived<T> extends State<T> {
  dependencies: State[];
}

export interface Effect {
  fn: () => void;
  dependencies: State[];
  cleanup?: () => void;
}

export function state<T>(initial: T): State<T>
export function derived<T>(fn: () => T): Derived<T>
export function effect(fn: () => void): () => void
export function dumpReactiveState(): { states: Array<{name?: string, value: any}>, effects: Array<{fn: string}> }
```

- `dumpReactiveState()` 为调试工具函数，返回当前状态快照（Phase 6 消费）。
- `State` 和 `Derived` 的 `value` setter 会触发依赖更新和 effect 执行。
- 所有函数都是纯函数，不依赖 DOM，可在 Node 环境运行。

## 4. 文件级改动清单（按此顺序执行）

1. `packages/core/src/reactive.ts`（新建，主体）
2. `packages/core/src/index.ts`（改：导出 state/derived/effect/dumpReactiveState）
3. `packages/core/test/reactive.test.mjs`（新建，node:test、零依赖、无 DOM）
4. `package.json`（改：`test` 脚本已扩为扫描 `packages/core/test/`，无需再改）
5. `examples/reactive-demo.html` + `examples/reactive-demo-app.js`（新建，见 §7）
6. `docs/spec/reactive-api.md`（新建：API 契约，Phase 4/6 消费）
7. `docs/decisions/R-3.md`（新建，结论归档）

不修改：parser/registry、scoper/devtools 包、bench、scripts/* 各检测脚本、tsconfig、lockfile。

## 5. reactive 实现要点（手写调度器，直接照做）

### 5.1 全局状态管理

```ts
let effectStack: Effect[] = [];
let batchDepth = 0;
let batchQueue: Array<() => void> = [];
let isFlushing = false;

function state<T>(initial: T): State<T> {
  const subscribers = new Set<Effect>();
  let currentValue = initial;
  
  return {
    get value() {
      if (effectStack.length > 0) {
        const currentEffect = effectStack[effectStack.length - 1];
        subscribers.add(currentEffect);
        currentEffect.dependencies.push(this);
      }
      return currentValue;
    },
    set value(newValue) {
      if (currentValue === newValue) return;
      currentValue = newValue;
      markSubscribersDirty(subscribers);
    },
    dispose() {
      subscribers.clear();
    }
  };
}
```

全局状态说明：`effectStack` 为当前 effect 执行栈（读时登记依赖取栈顶）；`batchDepth` 为批处理嵌套深度；`batchQueue` 为待 flush 的微任务队列；`isFlushing` 标记是否正在 flush。

### 5.2 Derived 实现

```ts
function derived<T>(fn: () => T): Derived<T> {
  const state = state<T>(undefined as T);
  const dependencies = new Set<State>();
  
  const evaluate = () => {
    const prevEffectStack = effectStack;
    effectStack = [];
    
    try {
      const result = fn();
      state.value = result;
      dependencies.clear();
      dependencies.forEach(dep => {
        if (!state.dependencies.includes(dep)) {
          state.dependencies.push(dep);
        }
      });
    } finally {
      effectStack = prevEffectStack;
    }
  };
  
  evaluate();

  return {
    ...state,
    dependencies: Array.from(dependencies)
  };
}
```

derived 创建后立即调用一次 `evaluate()` 完成初始计算并登记依赖。

### 5.3 Effect 实现

```ts
function effect(fn: () => void): () => void {
  const effectObj: Effect = {
    fn,
    dependencies: []
  };
  
  const cleanup = () => {
    effectObj.dependencies.forEach(dep => {
      dep.dispose();
    });
    effectObj.dependencies = [];
  };
  
  const wrappedFn = () => {
    effectStack.push(effectObj);
    try {
      fn();
    } finally {
      effectStack.pop();
    }
  };
  
  wrappedFn();

  return () => {
    cleanup();
  };
}
```

effect 创建后立即执行一次 `wrappedFn()`，在 effect 栈中运行 `fn()` 以完成依赖登记。

### 5.4 批处理与调度

```ts
function markSubscribersDirty(subscribers: Set<Effect>) {
  if (batchDepth > 0) {
    subscribers.forEach(effect => {
      if (!effect.dirty) {
        effect.dirty = true;
        batchQueue.push(() => {
          if (effect.dirty) {
            effect.fn();
            effect.dirty = false;
          }
        });
      }
    });
  } else {
    flush();
  }
}

function flush() {
  if (isFlushing) return;
  isFlushing = true;
  
  while (batchQueue.length > 0) {
    const task = batchQueue.shift();
    if (task) task();
  }
  
  isFlushing = false;
}

queueMicrotask(() => {
  if (batchDepth === 0) {
    flush();
  }
});
```

调度语义：批处理模式下只标记 dirty 并入队，不立即执行；非批处理模式立即调用 `flush()`；末尾的 `queueMicrotask` 在批处理结束后（`batchDepth === 0`）于微任务中执行 flush。

### 5.5 循环依赖检测

```ts
function checkCircularDependency(state: State, effect: Effect) {
  if (effect.dependencies.includes(state)) {
    throw new Error('Circular dependency detected');
  }
}
```

## 6. 单测清单（packages/core/test/reactive.test.mjs，node:test，零依赖）

用例名与断言（可微调命名，断言必须覆盖到）：
1. `state 基本读写` — `const s = state(0); s.value = 1; assert(s.value === 1)`
2. `derived 基本计算` — `const d = derived(() => s.value * 2); assert(d.value === 2)`
3. `derived 依赖追踪` — 修改 s 后，d.value 自动更新
4. `effect 基本执行` — `effect(() => { log(s.value) }); assert(log 包含 0)`
5. `effect 依赖追踪` — 修改 s 后，effect 再次执行
6. `批处理` — 同一任务内多次修改 s，只触发一次 effect 执行
7. `写合并` — 连续写 s.value = 1; s.value = 2; 最终值为 2
8. `微任务调度` — effect 执行在微任务中，不追帧
9. `dispose` — s.dispose() 后，修改 s 不再触发 effect
10. `derived 惰性计算` — derived 只在访问时计算
11. `循环依赖检测` — `const d1 = derived(() => d2.value); const d2 = derived(() => d1.value);` 抛错
12. `effect 返回 cleanup` — `const cleanup = effect(fn); cleanup();` 后不再响应
13. `dumpReactiveState` — 返回状态快照，包含 states 和 effects
14. `多个 derived 依赖同一 state` — 修改 s，所有 derived 都更新
15. `derived 依赖其他 derived` — 链式依赖正确追踪
16. `effect 栈管理` — 嵌套 effect 的依赖关系正确

## 7. 验收演示 examples/reactive-demo.html

- 无构建、无模块：两个 `<script>` 普通标签顺序引 `../../packages/core/dist/core.global.js` 与 `reactive-demo-app.js`
- demo 中：定义 `count = state(0)`、`doubled = derived(() => count.value * 2)`、`effect(() => { log(count.value, doubled.value) })`
- 交互：按钮修改 count.value，显示当前值和 doubled 值，以及 effect 执行次数
- 状态 dump 显示：当前所有 state/derived 的值和依赖关系
- file:// 直开可运行；脚本末尾把自检布尔写进 `<pre id="result">`

## 8. R-3 结论归档

- `docs/spec/reactive-api.md`：API 契约（Phase 4 渲染管线消费、Phase 6 devtools 面板消费）
- `docs/decisions/R-3.md`：背景 / 实现要点 / 性能特征 / 与其他框架对比 / 结论（纯数据层、脱离 DOM、批处理 + 写合并）

## 9. 验证命令（全部真实运行并留输出）

1. `npm install`（确认无新依赖进入 package-lock 的 dependencies）
2. `npm run build`（core 产物含 reactive；global 与 esm 都出）
3. `npm run typecheck`
4. `npm test`（旧 parser 用例 + 新 reactive 用例全绿）
5. `npm run bench`
6. `npm run ci:all`（含 check-deps / check-gzip / check-no-comments 全绿）
7. `node scripts/serve.mjs`（后台）→ `curl -s -o /dev/null -w "%{http_code}"` 探 `/examples/reactive-demo.html` 和 `/examples/reactive-demo-app.js` → 全部 200；随后停服。

## 10. 收尾核对（DoD ↔ 验收映射）

| tasks.md | 验收 | 本文档对应 |
| --- | --- | --- |
| Ph3-T1 | state/derived/effect API 实现并通过脱离 DOM 单测 | §5/§6（16+ 用例覆盖所有语义） |
| Ph3-T1 | 批处理 + 写合并 + 微任务调度 | §5.4（不追帧、原子性） |
| Ph3-T2 | 演示页无构建运行 | §7（file:// 直开，HTTP 200） |
| Ph3-T3 | R-3 结论归档 | §8/§9（API 契约 + 决策文档） |

## 11. 偏差处理

- 遇到本文档未定义的情况：**不做创造性设计**；选最小保守行为并在最终报告中单列「偏差记录」（含位置、选择、理由），不得静默偏离。
- 任何一步真实失败（如 esbuild 报错、单测红）：停下修到绿再继续，禁止跳过或注释掉失败断言。
- 全程禁止 web 搜索、禁止引入新依赖、禁止写注释（含临时代码）；临时文件用后即删。
