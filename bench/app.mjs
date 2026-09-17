import { define } from '../packages/core/dist/core.mjs'

const BOARD_TEMPLATE =
  '<div class="board">' +
  '<header class="head">' +
  '<h1 class="title">{{ title }}</h1>' +
  '<span class="rev">{{ revision }}</span>' +
  '<span class="picked">{{ picked }}</span>' +
  '<span class="total">{{ total }}</span>' +
  '</header>' +
  '<div class="rows">' +
  '<div class="row" yq-for="(task, position) in tasks" yq-key="id">' +
  '<span class="pos">{{ position }}</span>' +
  '<span class="label">{{ task.title }}</span>' +
  '<span class="flag">{{ task.flag }}</span>' +
  '<button class="pick" yq-on:click="pick">pick</button>' +
  '</div>' +
  '</div>' +
  '</div>'

const BOARD_STYLE =
  '.board { display: block; }' +
  '.head { display: flex; gap: 8px; }' +
  '.row { display: flex; gap: 8px; }' +
  '.flag { color: #64748b; }'

function makeTasks(count, seed) {
  const tasks = []
  for (let index = 0; index < count; index++) {
    const id = seed + index
    tasks.push({ id: id, title: 'task ' + id, flag: index % 2 === 0 ? 'open' : 'closed' })
  }
  return tasks
}

function refreshTasks(tasks, revision) {
  const flag = revision % 2 === 0 ? 'open' : 'closed'
  const next = []
  for (const task of tasks) {
    next.push({ id: task.id, title: task.title, flag: flag })
  }
  return next
}

function defineBoard(name, tasks) {
  define(name, {
    name: name,
    template: BOARD_TEMPLATE,
    style: BOARD_STYLE,
    script: function () {
      return {
        state: {
          title: 'yq bench board',
          revision: 0,
          picked: 0,
          total: tasks.length,
          tasks: tasks
        },
        pick: function (state) {
          state.revision = state.revision + 1
          state.picked = state.task.id
        }
      }
    }
  })
  return name
}

function findByClass(root, className) {
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) {
      continue
    }
    if (node.attrs && node.attrs.class === className) {
      return node
    }
    const children = node.children || []
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push(children[index])
    }
  }
  return null
}

function firstRowButton(root) {
  const rows = findByClass(root, 'rows')
  if (!rows || rows.children.length === 0) {
    return null
  }
  return findByClass(rows.children[0], 'pick')
}

export { makeTasks, refreshTasks, defineBoard, findByClass, firstRowButton }
