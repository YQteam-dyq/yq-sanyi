

const results = [];


try {
    yq.define('csp-test-function', {
        style: '.test { color: blue; }',
        template: '<div class="test">{{ message }}</div>',
        script: function() {
            return { message: '函数式组件成功' };
        }
    });
    
    const functionComponent = yq.lookup('csp-test-function');
    const functionResult = functionComponent.cdo.scriptFactory();
    results.push(`1. 函数式组件调用结果: 成功 - ${functionResult.message}`);
} catch (error) {
    results.push(`1. 函数式组件调用结果: 失败 - ${error.message}`);
}


try {
    yq.define('csp-test-string', {
        style: '.test { color: green; }',
        template: '<div class="test">{{ message }}</div>',
        script: 'return { message: "字符串式组件成功" };'
    });
    
    const stringComponent = yq.lookup('csp-test-string');
    const stringResult = stringComponent.cdo.scriptFactory();
    results.push(`2. 字符串式组件调用结果: 成功 - ${stringResult.message}`);
} catch (error) {
    results.push(`2. 字符串式组件调用结果: 失败 - ${error.name}: ${error.message}`);
}


try {
    const newFunctionResult = new Function('return "new Function 成功";')();
    results.push(`3. 直接 new Function 调用结果: 成功 - ${newFunctionResult}`);
} catch (error) {
    results.push(`3. 直接 new Function 调用结果: 失败 - ${error.name}: ${error.message}`);
}


document.getElementById('out').textContent = results.join('\n');