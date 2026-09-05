# 响应式 API 契约

## 概述

本文档定义了 yq-sanyi 响应式系统的 API 契约，供 Phase 4 渲染管线和 Phase 6 devtools 面板消费。

## 核心类型定义

### State<T>

可变状态对象的基础接口。

```typescript
interface State<T> {
  value: T;
  dispose(): void;
}
```

- `value: T`：状态值。
- `dispose(): void`：清理资源，移除所有订阅关系。

### Derived<T>

派生状态，自动追踪依赖关系。

```typescript
interface Derived<T> extends State<T> {
  dependencies: State<any>[];
}
```

- `dependencies`：依赖的状态数组（调试用）。

### Effect

副作用对象，包含执行函数和依赖关系。

```typescript
interface Effect {
  fn: () => void;
  dependencies: State<any>[];
  cleanup?: () => void;
  dirty?: boolean;
}
```

- `fn`：副作用函数。
- `dependencies`：依赖的状态数组。
- `cleanup`：清理函数（可选）。
- `dirty`：是否需要重新执行（内部用）。

## 核心函数

### state<T>(initial: T): State<T>

创建可变状态对象。

**参数：**
- `initial: T` - 初始值

**返回值：**
- `State<T>` - 可变状态对象

**示例：**
```typescript
const count = state(0);
count.value = 1;
```

此例以 0 为初值创建计数状态，随后把 `count.value` 修改为 1。

### derived<T>(fn: () => T): Derived<T>

创建派生状态，自动追踪依赖关系。

**参数：**
- `fn: () => T` - 计算函数，返回派生值

**返回值：**
- `Derived<T>` - 派生状态对象

**示例：**
```typescript
const doubled = derived(() => count.value * 2);
console.log(doubled.value);
```

此例打印 `doubled.value`，输出为 2。

### effect(fn: () => void): () => void

创建副作用，在依赖的状态变化时自动执行。

**参数：**
- `fn: () => void` - 副作用函数

**返回值：**
- `() => void` - 清理函数，调用后移除所有订阅关系

**示例：**
```typescript
const cleanup = effect(() => {
  console.log(`Count: ${count.value}`);
});
cleanup();
```

上例中，`effect` 返回的 `cleanup` 函数用于手动清理副作用（如组件卸载时调用）。

### dumpReactiveState(): { states: Array<{value: any, dependencies: number}>, effects: Array<{fn: string, dependencies: number, dirty: boolean}> }

获取当前状态快照，用于调试和开发工具。

**返回值：**
- `Object` - 包含状态和副作用信息的快照

**示例：**
```typescript
const dump = dumpReactiveState();
console.log(dump.states);
console.log(dump.effects);
```

上例打印的 `dump.states` 含所有状态信息，`dump.effects` 含所有副作用信息。

## 语义特性

### 依赖追踪

- **读时登记**：访问 `state.value` 或 `derived.value` 时，自动记录当前 effect 的依赖关系
- **写时标脏**：修改 `state.value` 时，标记该 state 及依赖的 derived 为 dirty
- **惰性计算**：derived 只在访问时计算，且只计算 dirty 的 derived

### 批处理与调度

- **批处理**：同一同步任务内多次对同一 state 写入，只触发一次 flush
- **写合并**：同字段连续写，只保留最后一次值（如 `s.value=1; s.value=2;` → 最终值 2）
- **微任务调度**：flush 通过 `queueMicrotask` 执行，不追帧

### 内存管理

- **实例级 dispose**：每个 state 和 derived 都有 `dispose()` 方法，用于清理资源
- **自动清理**：调用 `effect` 返回的 cleanup 函数，移除该 effect 的所有订阅关系

### 错误处理

- **循环依赖检测**：如果 effect 中修改了 state，该 state 又被同一 effect 依赖，抛 `Error: Circular dependency detected`

## 渲染管线消费指南

### Phase 4 渲染管线

渲染管线可以通过以下方式消费响应式 API：

```typescript
const count = state(0);
const displayCount = derived(() => count.value > 0 ? `Count: ${count.value}` : 'Empty');

const cleanup = effect(() => {
  const element = document.getElementById('counter');
  if (element) {
    element.textContent = displayCount.value;
  }
});
```

示例流程：先读取状态值，创建 `count` 状态及派生值 `displayCount`；再创建副作用把 `displayCount.value` 更新到页面元素；组件卸载时通过 `component.onUnmount(() => cleanup())` 调用 `cleanup` 清理。

### 状态绑定

渲染管线应该绑定到 `State.value` 属性：

```typescript
const stateBinding = (element: HTMLElement, state: State<string>) => {
  const update = () => element.textContent = state.value;
  effect(update);
  return () => cleanup;
};
```

`stateBinding` 通过 `effect(update)` 自动响应状态变化并更新元素文本；其返回的 `cleanup` 即清理函数，供调用方（如组件卸载时）执行。

## Devtools 面板消费指南

### Phase 6 Devtools

开发工具面板可以通过 `dumpReactiveState()` 获取状态快照：

```typescript
const snapshot = dumpReactiveState();

console.log('States:', snapshot.states);
console.log('Effects:', snapshot.effects);

const visualizeDependencies = (snapshot) => {
  return {
    nodes: snapshot.states.map(s => ({
      id: s.value,
      label: `State: ${s.value}`,
      dependencies: s.dependencies
    })),
    edges: snapshot.effects.flatMap(e => 
      e.dependencies.map(dep => ({
        from: e.fn,
        to: dep
      }))
    )
  };
};
```

示例先调用 `dumpReactiveState()` 获取完整状态快照并分别打印 states/effects 信息；`visualizeDependencies` 再把快照映射为依赖关系图（states 为节点，effects 与其依赖构成边）。

### 实时监控

```typescript
const monitorState = (state: State<any>) => {
  const cleanup = effect(() => {
    console.log('State changed:', state.value);
  });
  return cleanup;
};

const monitorEffects = () => {
  const cleanup = effect(() => {
    const snapshot = dumpReactiveState();
    console.log('Effects snapshot:', snapshot.effects);
  });
  return cleanup;
};
```

`monitorState` 通过 effect 监控状态变化（变化时打印新值）；`monitorEffects` 监控所有副作用（每次 flush 打印 effects 快照）。

## 性能考虑

### 批处理优化

- 同一同步任务内的多次写入会被批处理
- 减少不必要的 DOM 更新和重新计算

### 依赖追踪优化

- 只在访问时重新计算 derived
- 避免在 effect 中进行不必要的计算

### 内存管理

- 及时调用 `dispose()` 方法清理不再使用的状态
- 避免循环引用导致的内存泄漏

## 最佳实践

### 1. 状态组织

```typescript
const userState = state({
  name: 'Alice',
  age: 25
});

const userName = derived(() => userState.value.name);
const userAge = derived(() => userState.value.age);
```

好的组织方式：把相关状态集中到一个 `userState` 对象，再以 `derived` 派生出 `userName`、`userAge` 等，实现字段级响应式更新。

### 2. 副作用管理

```typescript
const setupEffect = () => {
  const cleanup = effect(() => {
    const subscription = api.subscribe(data => {
      updateData(data);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  });
  
  return cleanup;
};
```

正确的副作用使用方式：effect 内执行订阅逻辑（副作用），在其返回的清理函数中 `subscription.unsubscribe()` 取消订阅；外层把 `cleanup` 暴露给调用方（如组件卸载时调用）。

### 3. 错误边界

```typescript
const safeEffect = (fn: () => void) => {
  const cleanup = effect(() => {
    try {
      fn();
    } catch (error) {
      console.error('Effect error:', error);
    }
  });
  return cleanup;
};
```

错误处理：`safeEffect` 把 effect 的执行包进 try/catch，出错时打印 `Effect error:` 并按需执行错误恢复逻辑。

## 兼容性

- **运行时环境**：支持 Node.js 18.17+ 和现代浏览器
- **模块系统**：支持 ESM 和 IIFE 两种格式
- **类型系统**：完整的 TypeScript 类型定义

## 版本历史

- **v0.0.0** - 初始版本，实现基本的响应式功能

## 相关文档

- [Phase 3 技术规范](../../.trae/specs/yq-sanyi/phase-3/spec.md)
- [Phase 3 实现计划](../../docs/plans/phase-3.md)
- [技术决策文档](../decisions/R-3.md)