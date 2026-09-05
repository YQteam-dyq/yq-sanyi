import { test } from 'node:test'
import { state, derived, effect, dumpReactiveState } from '../dist/core.mjs'
import assert from 'node:assert/strict'

test('state 基本读写', () => {
  const s = state(0);
  s.value = 1;
  assert.strictEqual(s.value, 1);
});

test('derived 基本计算', () => {
  const s = state(1);
  const d = derived(() => s.value * 2);
  assert.strictEqual(d.value, 2);
});

test('derived 依赖追踪', () => {
  const s = state(1);
  const d = derived(() => s.value * 2);
  assert.strictEqual(d.value, 2);
  s.value = 3;
  assert.strictEqual(d.value, 6);
});

test('effect 基本执行', () => {
  const s = state(0);
  let effectCount = 0;
  effect(() => {
    effectCount++;
    s.value;
  });
  assert.strictEqual(effectCount, 1);
});

test('effect 依赖追踪', () => {
  const s = state(0);
  let effectCount = 0;
  effect(() => {
    effectCount++;
    s.value;
  });
  assert.strictEqual(effectCount, 1);
  s.value = 1;
  assert.strictEqual(effectCount, 2);
});

test('批处理', async () => {
  const s = state(0);
  let effectCount = 0;
  effect(() => {
    effectCount++;
  });
  s.value = 1;
  s.value = 2;
  s.value = 3;
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(effectCount, 2);
});

test('写合并', async () => {
  const s = state(0);
  let effectCount = 0;
  effect(() => {
    effectCount++;
  });
  s.value = 1;
  s.value = 2;
  s.value = 3;
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.strictEqual(s.value, 3);
});

test('微任务调度', async () => {
  const s = state(0);
  let effectTime = null;
  effect(() => {
    effectTime = Date.now();
  });
  const startTime = Date.now();
  s.value = 1;
  await new Promise(resolve => setTimeout(resolve, 20));
  const endTime = Date.now();
  assert(effectTime - startTime >= 5);
});

test('dispose', () => {
  const s = state(0);
  let effectCount = 0;
  const cleanup = effect(() => {
    effectCount++;
    s.value;
  });
  s.value = 1;
  assert.strictEqual(effectCount, 2);
  cleanup();
  s.value = 2;
  assert.strictEqual(effectCount, 2);
});

test('derived 惰性计算', () => {
  const s = state(0);
  let computeCount = 0;
  const d = derived(() => {
    computeCount++;
    return s.value * 2;
  });
  assert.strictEqual(computeCount, 1);
  s.value = 1;
  assert.strictEqual(computeCount, 1);
  d.value;
  assert.strictEqual(computeCount, 2);
});

test('循环依赖检测', () => {
  assert.throws(() => {
    const d1 = derived(() => d2.value);
    const d2 = derived(() => d1.value);
  }, 'Circular dependency detected');
});

test('effect 返回 cleanup', () => {
  const s = state(0);
  let effectCount = 0;
  const cleanup = effect(() => {
    effectCount++;
    s.value;
  });
  s.value = 1;
  assert.strictEqual(effectCount, 2);
  cleanup();
  s.value = 2;
  assert.strictEqual(effectCount, 2);
});

test('dumpReactiveState', () => {
  const s = state(0);
  const d = derived(() => s.value * 2);
  effect(() => {
    s.value;
  });
  const dump = dumpReactiveState();
  assert.strictEqual(dump.states.length, 2);
  assert.strictEqual(dump.effects.length, 1);
});

test('多个 derived 依赖同一 state', () => {
  const s = state(0);
  const d1 = derived(() => s.value * 2);
  const d2 = derived(() => s.value * 3);
  assert.strictEqual(d1.value, 0);
  assert.strictEqual(d2.value, 0);
  s.value = 1;
  assert.strictEqual(d1.value, 2);
  assert.strictEqual(d2.value, 3);
});

test('derived 依赖其他 derived', () => {
  const s = state(0);
  const d1 = derived(() => s.value * 2);
  const d2 = derived(() => d1.value * 3);
  assert.strictEqual(d2.value, 0);
  s.value = 1;
  assert.strictEqual(d1.value, 2);
  assert.strictEqual(d2.value, 6);
});

test('effect 栈管理', () => {
  const s1 = state(0);
  const s2 = state(0);
  let order = [];
  effect(() => {
    order.push(1);
    s1.value;
    effect(() => {
      order.push(2);
      s2.value;
    });
    s1.value;
  });
  s1.value = 1;
  s2.value = 1;
  assert.strictEqual(order.length, 4);
});