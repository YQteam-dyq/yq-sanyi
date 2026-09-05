var effectStack = [];
var batchDepth = 0;
var batchQueue = [];
var isFlushing = false;
var globalStates = [];
var globalEffects = [];
function state(initial) {
  const subscribers = new Set();
  let currentValue = initial;
  const stateObj = {
    get value() {
      if (effectStack.length > 0) {
        const currentEffect = effectStack[effectStack.length - 1];
        subscribers.add(currentEffect);
        currentEffect.dependencies.push(stateObj);
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
      globalStates = globalStates.filter((s) => s !== stateObj);
    }
  };
  globalStates.push(stateObj);
  return stateObj;
}
function derived(fn) {
  const baseState = state(void 0);
  const dependencies = new Set();
  let dirty = true;
  const evaluate = () => {
    if (!dirty) return;
    const prevEffectStack = effectStack;
    effectStack = [];
    try {
      const result = fn();
      baseState.value = result;
      dependencies.clear();
      effectStack.forEach((effect2) => {
        dependencies.add(effect2);
      });
      dirty = false;
    } finally {
      effectStack = prevEffectStack;
    }
  };
  evaluate();
  const derivedObj = {
    ...baseState,
    dependencies: Array.from(dependencies),
    get value() {
      evaluate();
      return baseState.value;
    }
  };
  return derivedObj;
}
function effect(fn) {
  const effectObj = {
    fn,
    dependencies: []
  };
  globalEffects.push(effectObj);
  const cleanup = () => {
    effectObj.dependencies.forEach((dep) => {
      dep.dispose();
    });
    effectObj.dependencies = [];
    globalEffects = globalEffects.filter((e) => e !== effectObj);
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
  return cleanup;
}
function markSubscribersDirty(subscribers) {
  subscribers.forEach((effect2) => {
    if (!effect2.dirty) {
      effect2.dirty = true;
      batchQueue.push(() => {
        if (effect2.dirty) {
          effect2.fn();
          effect2.dirty = false;
        }
      });
    }
  });
  if (batchDepth === 0) {
    queueMicrotask(() => {
      if (batchDepth === 0) {
        flush();
      }
    });
  }
}
function flush() {
  if (isFlushing) return;
  isFlushing = true;
  while (batchQueue.length > 0) {
    const task = batchQueue.shift();
    if (task) {
      task();
    }
  }
  isFlushing = false;
}
function dumpReactiveState() {
  const stateMap = new Map();
  globalStates.forEach((state2) => {
    if (state2.hasOwnProperty("dependencies")) {
      const derivedObj = state2;
      stateMap.set(derivedObj, {
        type: "derived",
        value: derivedObj.value,
        dependencies: derivedObj.dependencies.length
      });
    } else {
      stateMap.set(state2, {
        type: "state",
        value: state2.value,
        dependencies: 0
      });
    }
  });
  return stateMap;
}
export {
  derived,
  dumpReactiveState,
  effect,
  state
};
