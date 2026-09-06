function slotText(slot) {
  if (slot.kind === 'text') return '文本槽(node' + slot.nodeId + ', part' + slot.partIndex + ')';
  if (slot.kind === 'attr') return '属性槽(node' + slot.nodeId + ', ' + slot.attr + ')';
  if (slot.kind === 'bool') return '布尔槽(node' + slot.nodeId + ', ' + slot.attr + ')';
  if (slot.kind === 'list') return '列表槽(node' + slot.nodeId + ', ' + slot.itemVar + ' in ' + slot.itemsPath.join('.') + ')';
  if (slot.kind === 'event') return '事件槽(node' + slot.nodeId + ', ' + slot.event + ' -> ' + slot.handler + ')';
  return slot.kind;
}

yq.define('yq-login-form', {
  style: `.login-form { max-width: 300px; margin: 20px 0; padding: 20px; border: 1px solid #ccc; border-radius: 4px; font-family: sans-serif; }
          .login-form h3 { margin-top: 0; }
          .login-form .form-group { margin-bottom: 12px; }
          .login-form label { display: block; margin-bottom: 4px; font-weight: bold; font-size: 13px; }
          .login-form input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ddd; border-radius: 4px; }
          .login-form button { margin-top: 4px; background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; }
          .login-form .error { color: #b3261e; margin-top: 8px; min-height: 1.2em; }`,
  template: '<form class="login-form"><h3>用户登录</h3><div class="form-group"><label for="username">用户名</label><input id="username" type="text" yq-on:input="syncField" data-field="username" placeholder="请输入用户名"></div><div class="form-group"><label for="password">密码</label><input id="password" type="password" yq-on:input="syncField" data-field="password" placeholder="请输入密码"></div><button type="button" yq-on:click="login">登录</button><div class="error">{{ form.error }}</div></form>',
  script: function () {
    return {
      state: {
        form: { username: '', password: '', error: '' }
      },
      syncField: function (state, event) {
        var field = event.target.getAttribute('data-field');
        state.form[field] = event.target.value;
      },
      login: function (state) {
        var form = state.form;
        if (form.username && form.password) {
          form.error = '欢迎登录，' + form.username;
        } else {
          form.error = '请输入用户名和密码';
        }
      }
    };
  }
});

yq.define('yq-todo-list', {
  style: `.todo-list { max-width: 500px; margin: 20px 0; padding: 20px; border: 1px solid #ccc; border-radius: 4px; font-family: sans-serif; }
          .todo-list h3 { margin-top: 0; }
          .todo-list .add-todo { display: flex; gap: 10px; margin-bottom: 14px; }
          .todo-list .add-todo input { flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .todo-list .add-todo button { background: #28a745; color: white; padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; }
          .todo-list .todo-item { padding: 8px 2px; border-bottom: 1px solid #eee; }
          .todo-list .todo-item:last-child { border-bottom: none; }`,
  template: '<div class="todo-list"><h3>待办事项</h3><div class="add-todo"><input type="text" value="{{ newTodo }}" yq-on:input="editNew" placeholder="添加新任务"><button yq-on:click="addTodo">添加</button></div><div yq-for="todo in todos" yq-key="id" class="todo-item"><span>{{ todo.text }}</span></div></div>',
  script: function () {
    return {
      state: {
        newTodo: '',
        todos: [
          { id: 1, text: '学习 yq-sanyi' },
          { id: 2, text: '完成示例页' }
        ]
      },
      editNew: function (state, event) {
        state.newTodo = event.target.value;
      },
      addTodo: function (state) {
        var text = state.newTodo.trim();
        if (text) {
          state.todos.push({ id: Date.now(), text: text });
          state.newTodo = '';
        }
      }
    };
  }
});

function componentInfo(entry) {
  var parts = entry.cdo.slots.map(slotText).join(', ');
  return '   - 槽数量: ' + entry.cdo.slots.length + '\n' +
         '   - 槽清单: ' + parts + '\n' +
         '   - 节点数量: ' + entry.cdo.nodes.length + '\n' +
         '   - 样式文本长度: ' + entry.cdo.styleText.length + ' 字节\n' +
         '   - 脚本工厂可调用: ' + (entry.cdo.scriptFactory ? '是' : '否');
}

document.addEventListener('DOMContentLoaded', function () {
  var loginForm = yq.lookup('yq-login-form');
  var todoList = yq.lookup('yq-todo-list');
  var result =
    '组件解析结果：\n' +
    '================\n\n' +
    '1. yq-login-form 组件：\n' + componentInfo(loginForm) + '\n\n' +
    '2. yq-todo-list 组件：\n' + componentInfo(todoList) + '\n\n' +
    '3. 引用自检：\n' +
    '   - loginForm lookup 两次引用相同: ' + (loginForm === yq.lookup('yq-login-form') ? 'PASS' : 'FAIL') + '\n' +
    '   - todoList lookup 两次引用相同: ' + (todoList === yq.lookup('yq-todo-list') ? 'PASS' : 'FAIL');
  document.getElementById('result').textContent = result;
});
