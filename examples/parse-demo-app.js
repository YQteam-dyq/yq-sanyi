yq.define('yq-login-form', {
    style: `.login-form { max-width: 300px; margin: 20px 0; padding: 20px; border: 1px solid #ccc; border-radius: 4px; }
            .login-form h3 { margin-top: 0; }
            .login-form .form-group { margin-bottom: 15px; }
            .login-form label { display: block; margin-bottom: 5px; font-weight: bold; }
            .login-form input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
            .login-form .error { color: red; margin-top: 5px; }
            .login-form button { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
            .login-form button:disabled { background: #ccc; cursor: not-allowed; }`,
    template: `<form class="login-form">
        <h3>用户登录</h3>
        <div class="form-group">
            <label for="username">用户名</label>
            <input type="text" id="username" value="{{ form.username }}" placeholder="请输入用户名">
        </div>
        <div class="form-group">
            <label for="password">密码</label>
            <input type="password" id="password" value="{{ form.password }}" placeholder="请输入密码">
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" yq-checked="{{ form.remember }}"> 记住我
            </label>
        </div>
        <button type="submit" disabled="{{ form.loading }}">登录</button>
        <div class="error">{{ form.error }}</div>
    </form>`,
    script: function() {
        return {
            form: {
                username: '',
                password: '',
                remember: false,
                loading: false,
                error: ''
            }
        };
    }
});

yq.define('yq-todo-list', {
    style: `.todo-list { max-width: 500px; margin: 20px 0; padding: 20px; border: 1px solid #ccc; border-radius: 4px; }
            .todo-list h3 { margin-top: 0; }
            .todo-list .todo-item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
            .todo-list .todo-item:last-child { border-bottom: none; }
            .todo-list .todo-item.completed { text-decoration: line-through; color: #888; }
            .todo-list .todo-item input[type="checkbox"] { margin-right: 10px; }
            .todo-list .add-todo { margin-top: 15px; }
            .todo-list .add-todo input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px; }
            .todo-list .add-todo button { background: #28a745; color: white; padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; }`,
    template: `<div class="todo-list">
        <h3>待办事项</h3>
        <div class="add-todo">
            <input type="text" placeholder="添加新任务" value="{{ newTodo }}">
            <button yq-click="addTodo">添加</button>
        </div>
        <div>
            <div yq-for="todo in todos" yq-key="todo.id" class="todo-item {{ todo.completed ? 'completed' : '' }}">
                <input type="checkbox" yq-checked="{{ todo.completed }}" yq-click="toggleTodo(todo)">
                <span>{{ todo.text }}</span>
            </div>
        </div>
    </div>`,
    script: function() {
        return {
            newTodo: '',
            todos: [
                { id: 1, text: '学习 yq-sanyi', completed: false },
                { id: 2, text: '完成项目', completed: true }
            ],
            addTodo: function() {
                if (this.newTodo.trim()) {
                    this.todos.push({
                        id: Date.now(),
                        text: this.newTodo.trim(),
                        completed: false
                    });
                    this.newTodo = '';
                }
            },
            toggleTodo: function(todo) {
                todo.completed = !todo.completed;
            }
        };
    }
});

const loginForm = yq.lookup('yq-login-form');
const todoList = yq.lookup('yq-todo-list');

let result = `组件解析结果：
================

1. yq-login-form 组件：
   - 槽数量: ${loginForm.cdo.slots.length}
   - 槽清单: ${loginForm.cdo.slots.map(slot => {
        if (slot.kind === 'text') return `文本槽(node${slot.nodeId}, part${slot.partIndex})`;
        if (slot.kind === 'attr') return `属性槽(node${slot.nodeId}, ${slot.attr})`;
        if (slot.kind === 'bool') return `布尔槽(node${slot.nodeId}, ${slot.attr})`;
        if (slot.kind === 'list') return `列表槽(node${slot.nodeId}, ${slot.itemVar} in ${slot.itemsPath.join('.')})`;
        return slot.kind;
     }).join(', ')}
   - 节点数量: ${loginForm.cdo.nodes.length}
   - 样式文本长度: ${loginForm.cdo.styleText.length} 字节
   - 脚本工厂可调用: ${loginForm.cdo.scriptFactory ? '是' : '否'}

2. yq-todo-list 组件：
   - 槽数量: ${todoList.cdo.slots.length}
   - 槽清单: ${todoList.cdo.slots.map(slot => {
        if (slot.kind === 'text') return `文本槽(node${slot.nodeId}, part${slot.partIndex})`;
        if (slot.kind === 'attr') return `属性槽(node${slot.nodeId}, ${slot.attr})`;
        if (slot.kind === 'bool') return `布尔槽(node${slot.nodeId}, ${slot.attr})`;
        if (slot.kind === 'list') return `列表槽(node${slot.nodeId}, ${slot.itemVar} in ${slot.itemsPath.join('.')})`;
        return slot.kind;
     }).join(', ')}
   - 节点数量: ${todoList.cdo.nodes.length}
   - 样式文本长度: ${todoList.cdo.styleText.length} 字节
   - 脚本工厂可调用: ${todoList.cdo.scriptFactory ? '是' : '否'}

3. 引用自检：
   - loginForm lookup 两次引用相同: ${loginForm === yq.lookup('yq-login-form') ? 'PASS' : 'FAIL'}
   - todoList lookup 两次引用相同: ${todoList === yq.lookup('yq-todo-list') ? 'PASS' : 'FAIL'}
`;

document.getElementById('result').textContent = result;