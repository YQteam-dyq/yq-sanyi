
const { state, derived, effect, dumpReactiveState } = yq;


const count = state(0);
const doubled = derived(() => count.value * 2);

let effectCount = 0;


const cleanup = effect(() => {
  effectCount++;
  updateDisplay();
});


function updateDisplay() {
  document.getElementById('count').textContent = count.value;
  document.getElementById('doubled').textContent = doubled.value;
  document.getElementById('effect-count').textContent = effectCount;
}


function increment() {
  count.value++;
}

function decrement() {
  count.value--;
}

function reset() {
  count.value = 0;
}

function dumpState() {
  const dump = dumpReactiveState();
  const stateDump = document.getElementById('state-dump');
  stateDump.textContent = JSON.stringify(dump, null, 2);
}


function selfCheck() {
  try {

    count.value = 5;
    if (count.value !== 5) throw new Error('state 基本读写失败');
    
    doubled.value;
    if (doubled.value !== 10) throw new Error('derived 计算失败');
    
    count.value = 10;
    if (doubled.value !== 20) throw new Error('derived 依赖追踪失败');
    

    if (effectCount < 2) throw new Error('effect 执行次数不足');
    

    const dump = dumpReactiveState();
    if (!dump.states || !dump.effects) throw new Error('状态快照格式错误');
    
    return true;
  } catch (error) {
    console.error('自检失败:', error.message);
    return false;
  }
}


document.addEventListener('DOMContentLoaded', () => {

  updateDisplay();
  

  setTimeout(() => {
    const passed = selfCheck();
    const resultDiv = document.getElementById('result');
    
    if (passed) {
      resultDiv.textContent = 'PASS: 所有自检通过';
      resultDiv.className = 'pass';
    } else {
      resultDiv.textContent = 'FAIL: 自检失败';
      resultDiv.className = 'fail';
    }
  }, 100);
});