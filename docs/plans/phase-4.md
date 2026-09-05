# Phase 4 详细策划案 · 渲染管线 + GATE-CV（yq-sanyi）

对应：`/workspace/.trae/specs/yq-sanyi/spec.md` §6.4、tasks.md Ph4-T1..T4、checklist.md Phase 4。
本策划案在派发前已将**设计决策全部锁死**：实施者按本文档逐步执行，禁止自行设计、自行扩缩范围、禁止上网搜索。

## 1. 目标与本阶段边界

- 做：打通「解析 → 状态 → 渲染 → 更新」最小全链路；render 以「静态骨架 + 绑定槽」渲染（文本/属性/布尔属性/列表四类槽）；写前比对的最小补丁；单次 flush 原子完成；列表带稳定 key 时首尾扫描 + 映射表复用节点；首个全链路真实组件（表单 + 列表 + 状态更新，P0-①）；批处理 + 最小更新自动化用例（P0-②）；零依赖 / 无构建验收演示页（P0-③）；与现役方案同屏对比 demo（体积 / 首屏 / 代码量，P0-④）；GATE-CV 红线门禁（原创性自检 + 体积/性能预算）。
- 不做（后续 Phase 负责，本阶段禁止引入）：
  - 不做样式作用域（Phase 5）；不做生命周期（Phase 6）；不做 devtools（Phase 6）；不做加载模型（Phase 7）。
  - 不依赖任何第三方（运行时与 devDependencies 保持现状：devDeps 仅 typescript + esbuild）。
  - 所有新建/修改的源码、脚本、HTML、docs 代码围栏内**不得出现任何注释**（Y-4）。写代码时不得在正则字面量内写 `//` 形态，字符串内 URL 写法必须带引号。
  - 不新增任何 npm scripts（Phase 5/6/7 各自负责各自脚本）。

## 2. 已锁定的设计决策（R-4 渲染语义）

### 2.1 渲染管线架构（单向依赖链）

```
registry.define → CDO → render(instance) → DOM 更新
    ↓           ↓         ↓
  parser     reactive   slot table
```

- `render(instance)` 接收 `{ name, props, children }`（children 暂不支持，Phase 6 生命周期引入）。
- 渲染流程：1) 克隆静态骨架树（一次）；2) 填充绑定槽（每次 flush）；3) 写前比对旧值，未变化跳过。
- 更新时机：响应式 flush 时调用 `render(instance, { force: false })`；force 仅用于首次挂载。

### 2.2 绑定槽消费（Phase 2 契约）

| 槽类型 | 数据路径 | 更新逻辑 | 示例 |
|--------|----------|----------|------|
| text | `['user','name']` | 文本节点内容替换 | `<p>{{ user.name }}</p>` |
| attr | `['form','name']` | 属性值替换 | `<input value="{{ form.name }}">` |
| bool | `['form','disabled']` | 存在性绑定 | `<button disabled="{{ form.disabled }}">` |
| list | `['items']` + key | 映射表复用节点 | `<ul><li yq-for="item in items">{{ item.name }}</li></ul>` |

- 列表更新策略：key 稳定时首尾扫描 + 映射表复用；无 key 时位置替换。
- 写前比对：`oldValue === newValue` 跳过，避免不必要的 DOM 操作。

### 2.3 实例管理

- `instance` 对象：`{ name, props, element, slots, lastValues }`
- `element` 为挂载点（真实 DOM 元素），`slots` 为当前填槽值映射。
- `lastValues` 记录上一次槽值，用于写前比对。

## 3. 公共 API 与 TypeScript 类型（新增于 packages/core/src）

新文件 `packages/core/src/render.ts`，导出：

```ts
export interface Instance {
  name: string;
  props: Record<string, unknown>;
  element: HTMLElement;
  slots: Map<string, unknown>;
  lastValues: Map<string, unknown>;
}

export function render(instance: Instance, options?: { force?: boolean }): void
export function unmount(instance: Instance): void
export function dumpRenderState(): { instances: Array<{name: string, element: string}> }
```

- `render(instance, { force: false })`：更新实例；force 仅首次挂载。
- `unmount(instance)`：移除实例及其所有订阅关系。
- `dumpRenderState()`：返回当前渲染状态（Phase 6 devtools 消费）。

## 4. 文件级改动清单（按此顺序执行）

1. `packages/core/src/render.ts`（新建，主体）
2. `packages/core/src/index.ts`（改：导出 render / unmount / dumpRenderState）
3. `packages/core/test/render.test.mjs`（新建，node:test、零依赖、无 DOM）
4. `examples/render-demo.html` + `examples/render-demo-app.js`（新建，见 §7）
5. `docs/spec/render-api.md`（新建：API 契约，Phase 5/6 消费）
6. `docs/decisions/R-4.md`（新建，结论归档）
7. `docs/decisions/Y-2.md`（新建，GATE-CV 红线门禁记录）

不修改：parser/registry/reactive、scoper/devtools 包、bench、scripts/* 各检测脚本、tsconfig、lockfile。

## 5. render 实现要点（直接照做）

### 5.1 实例管理

```ts
function render(instance: Instance, options: { force?: boolean } = {}) {
  const cdo = registry.lookup(instance.name);
  if (!cdo) throw new Error(`Component ${instance.name} not found`);
  
  if (options.force || !instance.element) {
    instance.element = cloneStaticTree(cdo.root);
    mountElement(instance.element, instance.element.parentNode);
  }
  
  fillSlots(instance, cdo);
}

function cloneStaticTree(node: SNode): HTMLElement {
  const element = document.createElement(node.tag);
  
  for (const [attr, value] of Object.entries(node.staticAttrs)) {
    element.setAttribute(attr, value);
  }
  
  for (const child of node.children) {
    element.appendChild(cloneStaticTree(child));
  }
  
  return element;
}
```

渲染时机：`force` 为 true 或实例尚未挂载时，先克隆静态骨架并挂载，随后填充绑定槽。`cloneStaticTree` 递归克隆节点：先写入静态属性，再递归克隆子节点。

### 5.2 填槽逻辑

```ts
function fillSlots(instance: Instance, cdo: Cdo) {
  const reactiveState = getReactiveStateFromProps(instance.props);
  
  for (const slot of cdo.slots) {
    const newValue = getSlotValue(slot, reactiveState);
    const oldValue = instance.lastValues.get(slot.id);
    
    if (oldValue === newValue) continue;
    
    updateSlot(instance, slot, newValue);
    instance.lastValues.set(slot.id, newValue);
  }
}

function updateSlot(instance: Instance, slot: Slot, newValue: unknown) {
  switch (slot.kind) {
    case 'text':
      const textNode = instance.element.querySelectorAll(`[data-yq-slot="${slot.nodeId}"]`)[slot.partIndex];
      textNode.textContent = String(newValue);
      break;
    case 'attr':
      instance.element.setAttribute(slot.attr, String(newValue));
      break;
    case 'bool':
      if (newValue) {
        instance.element.setAttribute(slot.attr, '');
        instance.element[slot.attr] = true;
      } else {
        instance.element.removeAttribute(slot.attr);
        instance.element[slot.attr] = false;
      }
      break;
    case 'list':
      updateListSlot(instance, slot, newValue);
      break;
  }
}
```

填槽前先取 `lastValues` 中的旧值做写前比对（`oldValue === newValue` 时跳过）；值变化时更新 DOM 并写回 `lastValues`。`updateSlot` 按槽类型分发到 text/attr/bool/list 四种更新逻辑。

### 5.3 列表更新

```ts
function updateListSlot(instance: Instance, slot: Slot, newValue: unknown[]) {
  const container = instance.element;
  const keyProp = slot.keyProp;
  const oldItems = Array.from(container.children);
  const newItems = newValue.map((item, index) => {
    const key = keyProp ? getNestedValue(item, keyProp) : index;
    let element = findElementByKey(oldItems, key);
    
    if (!element) {
      element = cloneStaticTree(slot.templateNode);
      container.appendChild(element);
    }
    
    fillListElement(element, item, slot.childSlots);
    return element;
  });
  
  for (let i = oldItems.length - 1; i >= newItems.length; i--) {
    container.removeChild(oldItems[i]);
  }
}
```

列表更新逻辑：按 key 在旧节点中查找复用，未命中则克隆模板节点并填充其子槽；最后移除数量超出 `newItems` 的多余旧元素。

## 6. 单测清单（packages/core/test/render.test.mjs，node:test，零依赖）

用例名与断言（可微调命名，断言必须覆盖到）：
1. `text 槽更新` — 修改 state，文本节点内容正确更新
2. `attr 槽更新` — 修改 state，属性值正确更新
3. `bool 槽更新` — true/false 时属性存在/移除，property 正确设置
4. `list 槽基本更新` — 数组变化，列表正确渲染
5. `list 槽 key 复用` — 带 key 时节点复用，DOM 节点 identity 不变
6. `list 槽无 key 替换` — 无 key 时位置替换
7. `写前比对跳过` — 相同值不触发 DOM 更新
8. `首次挂载 force` — 首次渲染克隆静态骨架
9. `unmount 移除实例` — 移除后不再响应更新
10. `批处理原子性` — 多个 state 变化一次 flush 完成
11. `错误处理` — 不存在的组件名抛错
12. `dumpRenderState` — 返回实例状态快照

## 7. 验收演示 examples/render-demo.html

- 无构建、无模块：两个 `<script>` 普通标签顺序引 `../../packages/core/dist/core.global.js` 与 `render-demo-app.js`
- demo 中：定义 `yq-counter` 和 `yq-todo-list` 组件，使用 state/derived/effect + parser 渲染
- 交互：按钮修改 count，列表增删项，显示当前值和 effect 执行次数
- 状态 dump 显示：当前所有渲染实例的状态
- file:// 直开可运行；脚本末尾把自检布尔写进 `<pre id="result">`

## 8. GATE-CV 红线门禁（Y-2）

- **原创性自检**：对比现役方案（React/Vue/Solid），确保核心创新点（三位一体、零依赖、静态骨架+绑定槽）未被抄袭；输出对比表。
- **体积预算**：core.global.js gzip ≤12KB（已 Phase 1 达成，续测）。
- **性能预算**：首屏 ≤1000ms、更新延迟 ≤200ms、同屏 ≥55fps（用基准测试脚本测量）。
- **红线触发条件**：任何一项不达标，进入 Phase 8 发布前修复，不得跳过。

## 9. 验证命令（全部真实运行并留输出）

1. `npm install`（确认无新依赖进入 package-lock 的 dependencies）
2. `npm run build`（core 产物含 render；global 与 esm 都出）
3. `npm run typecheck`
4. `npm test`（旧 parser/reactive 用例 + 新 render 用例全绿）
5. `npm run bench`（性能基准测试，记录首屏/更新延迟/帧率）
6. `npm run ci:all`（含 check-deps / check-gzip / check-no-comments 全绿）
7. `node scripts/serve.mjs`（后台）→ `curl -s -o /dev/null -w "%{http_code}"` 探 `/examples/render-demo.html` 和 `/examples/render-demo-app.js` → 全部 200；随后停服。

## 10. 收尾核对（DoD ↔ 验收映射）

| tasks.md | 验收 | 本文档对应 |
| --- | --- | --- |
| Ph4-T1 | render 实现并通过脱离 DOM 单测 | §5/§6（12+ 用例覆盖所有语义） |
| Ph4-T2 | 全链路演示（parser + reactive + render） | §7（file:// 直开，HTTP 200） |
| Ph4-T3 | GATE-CV 红线门禁 | §8（原创性自检 + 体积/性能预算） |
| Ph4-T4 | R-4 结论归档 | §9/§10（API 契约 + 决策文档） |

## 11. 偏差处理

- 遇到本文档未定义的情况：**不做创造性设计**；选最小保守行为并在最终报告中单列「偏差记录」（含位置、选择、理由），不得静默偏离。
- 任何一步真实失败（如 esbuild 报错、单测红、性能不达标）：停下修到绿再继续，禁止跳过或注释掉失败断言。
- 全程禁止 web 搜索、禁止引入新依赖、禁止写注释（含临时代码）；临时文件用后即删。
- GATE-CV 任何一项红线不达标：必须修复达标，不得跳过或降级要求。
