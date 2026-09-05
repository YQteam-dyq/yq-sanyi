import { test } from 'node:test'
import { parseTemplate, createScriptFactory } from '../dist/core.mjs'
import assert from 'node:assert/strict'

test('text slot 基本路径与混合静态文本', () => {
  const result = parseTemplate('test', 'Hi {{ user.name }}!')
  assert.strictEqual(result.slots.length, 1)
  assert.deepEqual(result.slots[0], { kind: 'text', nodeId: 0, partIndex: 1 })
  assert.deepEqual(result.root.text, [
    { static: 'Hi ' },
    { path: ['user', 'name'] },
    { static: '!' }
  ])
})

test('attr 槽整值绑定', () => {
  const result = parseTemplate('test', '<input value="{{ form.name }}">')
  assert.strictEqual(result.slots.length, 1)
  assert.deepEqual(result.slots[0], { kind: 'attr', nodeId: 0, attr: 'value' })
  assert(!result.root.staticAttrs.hasOwnProperty('value'))
  assert.deepEqual(result.root.dynAttrs, { value: ['form.name'] })
})

test('bool 槽布尔属性集', () => {
  const result = parseTemplate('test', '<input disabled="{{ isDisabled }}">')
  assert.strictEqual(result.slots.length, 1)
  assert.deepEqual(result.slots[0], { kind: 'bool', nodeId: 0, attr: 'disabled' })
  assert(!result.root.staticAttrs.hasOwnProperty('disabled'))
  assert.deepEqual(result.root.dynAttrs, { disabled: ['isDisabled'] })
})

test('非整值属性抛错', () => {
  assert.throws(() => parseTemplate('test', '<input class="{{ c }} {{ d }}">'), '[yq:parse] test: attribute binding only supports whole value form')
})

test('list 槽完整语法', () => {
  const result = parseTemplate('test', '<ul><li yq-for="p in products" yq-key="id">{{ p.name }}</li></ul>')
  assert.strictEqual(result.slots.length, 2)
  assert.deepEqual(result.slots[0], { kind: 'list', nodeId: 1, itemVar: 'p', itemsPath: ['products'], keyProp: 'id' })
  assert.deepEqual(result.slots[1], { kind: 'text', nodeId: 1, partIndex: 0 })
  assert.deepEqual(result.root.children[0].list, { itemVar: 'p', itemsPath: ['products'], keyProp: 'id' })
})

test('list 省略写法', () => {
  const result = parseTemplate('test', '<div yq-for="products"></div>')
  assert.strictEqual(result.slots.length, 1)
  assert.deepEqual(result.slots[0], { kind: 'list', nodeId: 0, itemVar: 'item', itemsPath: ['products'], keyProp: null })
})

test('列表内嵌套列表抛错', () => {
  assert.throws(() => parseTemplate('test', '<div yq-for="a in items"><div yq-for="b in a"></div></div>'), '[yq:parse] test: nested yq-for not allowed')
})

test('多根抛错', () => {
  assert.throws(() => parseTemplate('test', '<a></a><b></b>'), '[yq:parse] test: extra content after root element')
})

test('空模板抛错', () => {
  assert.throws(() => parseTemplate('test', ''), '[yq:parse] test: empty template')
})

test('标签不闭合与不匹配', () => {
  assert.throws(() => parseTemplate('test', '<div><span></div>'), '[yq:parse] test: unclosed tag: span')
})

test('void 与自闭合', () => {
    const result = parseTemplate('test', '<img src="a.png"><br>')
    assert.strictEqual(result.nodes.length, 2)
    assert.strictEqual(result.nodes[0].tag, 'img')
    assert.strictEqual(result.nodes[0].children.length, 0)
    assert.strictEqual(result.nodes[1].tag, 'br')
    assert.strictEqual(result.nodes[1].children.length, 0)
  })
  
  test('实体解码', () => {
  const result = parseTemplate('test', 'A &amp; B &lt; C')
  expect(result.root.text).toEqual([{ static: 'A & B < C' }])
})

test('style 原样保留', () => {
  const style = 'p { margin: 0 } .c { color: red }'
  const result = parseTemplate('test', '<div></div>')
  const cdo = { name: 'test', root: result.root, nodes: result.nodes, styleText: style, scriptFactory: null, slots: result.slots }
  expect(cdo.styleText).toBe(style)
})

test('script 函数路径 factory 返回同一函数', () => {
  const script = function() { return 42 }
  const factory = createScriptFactory(script)
  expect(factory()).toBe(script)
})

test('script 字符串路径编译', () => {
  const factory = createScriptFactory('return 1')
  expect(factory()).toBe(1)
  
  expect(() => createScriptFactory('invalid syntax')).toThrow(SyntaxError)
})

test('define 解析一次缓存 & 多实例复用同一 CDO', async () => {
  const { define, lookup } = await import('../dist/core.mjs')
  const definition = { template: '<div>{{ x }}</div>', style: 'div { color: red }', script: null }
  define('test', definition)
  
  const result1 = lookup('test')
  const result2 = lookup('test')
  
  expect(result1).toBeDefined()
  expect(result2).toBeDefined()
  expect(result1.cdo).toBe(result2.cdo)
})

test('dynAttrs 与 yq-for 不入 staticAttrs', () => {
  const result = parseTemplate('test', '<div yq-for="items" yq-key="id" class="static">{{ item.name }}</div>')
  expect(result.root.staticAttrs).toEqual({ class: 'static' })
  expect(result.root.dynAttrs).toEqual({})
  expect(result.root.list).toEqual({ itemVar: 'item', itemsPath: ['items'], keyProp: 'id' })
})

test('错误消息前缀', () => {
  const cases = [
    () => parseTemplate('test', '<div yq-for="a in items"><div yq-for="b in a"></div></div>'),
    () => parseTemplate('test', '<a></a><b></b>'),
    () => parseTemplate('test', ''),
    () => parseTemplate('test', '<div><span></div>'),
    () => parseTemplate('test', '<input class="{{ c }} {{ d }}">')
  ]
  
  cases.forEach(fn => {
    try {
      fn()
    } catch (e) {
      expect(e.message).toMatch(/^\[yq:parse\] test:/)
    }
  })
})

test('根元素为列表抛错', () => {
  expect(() => parseTemplate('test', '<div yq-for="items"></div>')).toThrow('[yq:parse] test: root element cannot be yq-for')
})

test('路径解析错误', () => {
  expect(() => parseTemplate('test', '<div>{{ . }}</div>')).toThrow('[yq:parse] test: invalid path: .')
  expect(() => parseTemplate('test', '<div>{{ user. }}</div>')).toThrow('[yq:parse] test: invalid path: user.')
  expect(() => parseTemplate('test', '<div>{{ .name }}</div>')).toThrow('[yq:parse] test: invalid path: .name')
})

test('文本节点仅空白静态段丢弃', () => {
  const result = parseTemplate('test', '<div>   {{ x }}   </div>')
  expect(result.root.text).toEqual([
    { static: '   ' },
    { path: ['x'] },
    { static: '   ' }
  ])
})

test('注释处理', () => {
  const result = parseTemplate('test', '<!-- comment --><div>content</div>')
  expect(result.nodes).toHaveLength(1)
  expect(result.nodes[0].tag).toBe('div')
})

test('DOCTYPE 处理', () => {
  const result = parseTemplate('test', '<!DOCTYPE html><div>content</div>')
  expect(result.nodes).toHaveLength(1)
  expect(result.nodes[0].tag).toBe('div')
})

test('自闭合形式', () => {
  const result = parseTemplate('test', '<img/><br/>')
  expect(result.nodes).toHaveLength(2)
  expect(result.nodes[0].tag).toBe('img')
  expect(result.nodes[1].tag).toBe('br')
})

test('混合静态文本与多个表达式', () => {
  const result = parseTemplate('test', 'Hello {{ user.name }}, your score is {{ user.score }}!')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 0, partIndex: 3 })
  expect(result.root.text).toEqual([
    { static: 'Hello ' },
    { path: ['user', 'name'] },
    { static: ', your score is ' },
    { path: ['user', 'score'] },
    { static: '!' }
  ])
})

test('数字路径段', () => {
  const result = parseTemplate('test', '<div>{{ items.0.name }}</div>')
  expect(result.slots).toHaveLength(1)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 0, partIndex: 0 })
  expect(result.root.text).toEqual([{ path: ['items', '0', 'name'] }])
})

test('布尔属性值绑定', () => {
  const result = parseTemplate('test', '<input checked="{{ isChecked }}">')
  expect(result.slots).toHaveLength(1)
  expect(result.slots[0]).toEqual({ kind: 'bool', nodeId: 0, attr: 'checked' })
})

test('非布尔属性值绑定', () => {
  const result = parseTemplate('test', '<input value="{{ form.input }}">')
  expect(result.slots).toHaveLength(1)
  expect(result.slots[0]).toEqual({ kind: 'attr', nodeId: 0, attr: 'value' })
})

test('列表容器内部文本槽', () => {
  const result = parseTemplate('test', '<ul><li yq-for="item in items">{{ item.name }}</li></ul>')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'list', nodeId: 1, itemVar: 'item', itemsPath: ['items'], keyProp: null })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
})

test('嵌套元素文本槽', () => {
  const result = parseTemplate('test', '<div><span>{{ user.name }}</span></div>')
  expect(result.slots).toHaveLength(1)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
  expect(result.root.children[0].text).toEqual([{ path: ['user', 'name'] }])
})

test('多个属性绑定', () => {
  const result = parseTemplate('test', '<input value="{{ form.name }}" placeholder="{{ form.placeholder }}">')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'attr', nodeId: 0, attr: 'value' })
  expect(result.slots[1]).toEqual({ kind: 'attr', nodeId: 0, attr: 'placeholder' })
  expect(result.root.dynAttrs).toEqual({
    value: ['form.name'],
    placeholder: ['form.placeholder']
  })
})

test('混合静态和动态属性', () => {
  const result = parseTemplate('test', '<input class="static" value="{{ form.name }}">')
  expect(result.slots).toHaveLength(1)
  expect(result.slots[0]).toEqual({ kind: 'attr', nodeId: 0, attr: 'value' })
  expect(result.root.staticAttrs).toEqual({ class: 'static' })
  expect(result.root.dynAttrs).toEqual({ value: ['form.name'] })
})

test('空表达式抛错', () => {
  expect(() => parseTemplate('test', '<div>{{ }}</div>')).toThrow('[yq:parse] test: empty expression in {{ }}')
})

test('未闭合表达式抛错', () => {
  expect(() => parseTemplate('test', '<div>{{ user.name')).toThrow('[yq:parse] test: unclosed {{ expression')
})

test('复杂嵌套结构', () => {
  const result = parseTemplate('test', '<div class="container"><h1>{{ title }}</h1><p>{{ content }}</p></div>')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 2, partIndex: 0 })
  expect(result.root.children).toHaveLength(2)
  expect(result.root.children[0].text).toEqual([{ path: ['title'] }])
  expect(result.root.children[1].text).toEqual([{ path: ['content'] }])
})

test('带属性的列表项', () => {
  const result = parseTemplate('test', '<ul><li yq-for="item in items" class="item">{{ item.name }}</li></ul>')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'list', nodeId: 1, itemVar: 'item', itemsPath: ['items'], keyProp: null })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
  expect(result.root.children[0].staticAttrs).toEqual({ class: 'item' })
})

test('列表项带多个属性', () => {
  const result = parseTemplate('test', '<li yq-for="item in items" class="item" id="item-{{ item.id }}">{{ item.name }}</li>')
  expect(result.slots).toHaveLength(3)
  expect(result.slots[0]).toEqual({ kind: 'list', nodeId: 0, itemVar: 'item', itemsPath: ['items'], keyProp: null })
  expect(result.slots[1]).toEqual({ kind: 'attr', nodeId: 0, attr: 'id' })
  expect(result.slots[2]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.root.dynAttrs).toEqual({ id: ['item.id'] })
})

test('复杂文本混合', () => {
  const result = parseTemplate('test', 'Total: ${{ price }} (tax: ${{ tax }})')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 0, partIndex: 3 })
  expect(result.root.text).toEqual([
    { static: 'Total: $' },
    { path: ['price'] },
    { static: ' (tax: $' },
    { path: ['tax'] },
    { static: ')' }
  ])
})

test('重复定义抛错', async () => {
  const { define } = await import('../dist/core.mjs')
  const definition = { template: '<div></div>', style: 'div {}', script: null }
  define('test', definition)
  expect(() => define('test', definition)).toThrow('duplicate component definition: test')
})

test('script null 处理', () => {
  const factory = createScriptFactory(null)
  expect(factory).toBe(null)
})

test('script 非法类型抛错', () => {
  expect(() => createScriptFactory(123)).toThrow('script must be function, string, or null')
})

test('模板前后空白处理', () => {
  const result = parseTemplate('test', '  <div>{{ x }}</div>  ')
  expect(result.root.tag).toBe('div')
  expect(result.root.text).toEqual([{ path: ['x'] }])
})

test('复杂嵌套列表错误', () => {
  expect(() => parseTemplate('test', '<div yq-for="a in items"><div><span yq-for="b in a"></span></div></div>')).toThrow('[yq:parse] test: nested yq-for not allowed')
})

test('根元素为 void 标签', () => {
  const result = parseTemplate('test', '<img src="test.png">')
  expect(result.root.tag).toBe('img')
  expect(result.root.children).toHaveLength(0)
})

test('void 标签自闭合形式', () => {
  const result = parseTemplate('test', '<br/>')
  expect(result.root.tag).toBe('br')
  expect(result.root.children).toHaveLength(0)
})

test('复杂嵌套结构带多个列表', () => {
  const result = parseTemplate('test', '<div><div yq-for="group in groups"><span>{{ group.name }}</span></div></div>')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'list', nodeId: 1, itemVar: 'group', itemsPath: ['groups'], keyProp: null })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
})

test('带注释的模板', () => {
  const result = parseTemplate('test', '<!-- comment --><div>content</div><!-- another comment -->')
  expect(result.nodes).toHaveLength(1)
  expect(result.nodes[0].tag).toBe('div')
  expect(result.nodes[0].text).toEqual([{ static: 'content' }])
})

test('带DOCTYPE的模板', () => {
  const result = parseTemplate('test', '<!DOCTYPE html><html><head></head><body><div>content</div></body></html>')
  expect(result.nodes).toHaveLength(1)
  expect(result.nodes[0].tag).toBe('div')
})

test('混合注释和DOCTYPE', () => {
  const result = parseTemplate('test', '<!-- comment --><!DOCTYPE html><div>content</div>')
  expect(result.nodes).toHaveLength(1)
  expect(result.nodes[0].tag).toBe('div')
})

test('带属性的void元素', () => {
  const result = parseTemplate('test', '<img src="test.png" alt="test">')
  expect(result.root.tag).toBe('img')
  expect(result.root.staticAttrs).toEqual({ src: 'test.png', alt: 'test' })
  expect(result.root.children).toHaveLength(0)
})

test('带动态属性的void元素', () => {
  const result = parseTemplate('test', '<img src="{{ image.src }}" alt="{{ image.alt }}">')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'attr', nodeId: 0, attr: 'src' })
  expect(result.slots[1]).toEqual({ kind: 'attr', nodeId: 0, attr: 'alt' })
  expect(result.root.dynAttrs).toEqual({ src: ['image.src'], alt: ['image.alt'] })
})

test('带布尔属性的void元素', () => {
  const result = parseTemplate('test', '<input disabled="{{ isDisabled }}">')
  expect(result.slots).toHaveLength(1)
  expect(result.slots[0]).toEqual({ kind: 'bool', nodeId: 0, attr: 'disabled' })
})

test('复杂嵌套结构带多个文本槽', () => {
  const result = parseTemplate('test', '<div><h1>{{ title }}</h1><p>{{ content }}</p></div>')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 2, partIndex: 0 })
  expect(result.root.children[0].text).toEqual([{ path: ['title'] }])
  expect(result.root.children[1].text).toEqual([{ path: ['content'] }])
})

test('带多个属性的列表项', () => {
  const result = parseTemplate('test', '<li yq-for="item in items" class="item" data-id="{{ item.id }}">{{ item.name }}</li>')
  expect(result.slots).toHaveLength(3)
  expect(result.slots[0]).toEqual({ kind: 'list', nodeId: 0, itemVar: 'item', itemsPath: ['items'], keyProp: null })
  expect(result.slots[1]).toEqual({ kind: 'attr', nodeId: 0, attr: 'data-id' })
  expect(result.slots[2]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.root.dynAttrs).toEqual({ 'data-id': ['item.id'] })
})

test('复杂文本混合带多个表达式', () => {
  const result = parseTemplate('test', 'Total: ${{ price }} (tax: ${{ tax }}) - Discount: ${{ discount }}')
  expect(result.slots).toHaveLength(3)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 0, partIndex: 3 })
  expect(result.slots[2]).toEqual({ kind: 'text', nodeId: 0, partIndex: 5 })
  expect(result.root.text).toEqual([
    { static: 'Total: $' },
    { path: ['price'] },
    { static: ' (tax: $' },
    { path: ['tax'] },
    { static: ') - Discount: $' },
    { path: ['discount'] }
  ])
})

test('带嵌套列表的错误处理', () => {
  expect(() => parseTemplate('test', '<div yq-for="a in items"><div yq-for="b in a"></div></div>')).toThrow('[yq:parse] test: nested yq-for not allowed')
})

test('根元素为列表的错误处理', () => {
  expect(() => parseTemplate('test', '<div yq-for="items"></div>')).toThrow('[yq:parse] test: root element cannot be yq-for')
})

test('带多个属性的错误处理', () => {
  expect(() => parseTemplate('test', '<input class="{{ c }} {{ d }}">')).toThrow('[yq:parse] test: attribute binding only supports whole value form')
})

test('带复杂嵌套结构的错误处理', () => {
  expect(() => parseTemplate('test', '<div><span></div>')).toThrow('[yq:parse] test: unclosed tag: span')
})

test('带多个根元素的错误处理', () => {
  expect(() => parseTemplate('test', '<a></a><b></b>')).toThrow('[yq:parse] test: extra content after root element')
})

test('空模板的错误处理', () => {
  expect(() => parseTemplate('test', '')).toThrow('[yq:parse] test: empty template')
})

test('带未闭合表达式的错误处理', () => {
  expect(() => parseTemplate('test', '<div>{{ user.name')).toThrow('[yq:parse] test: unclosed {{ expression')
})

test('带空表达式的错误处理', () => {
  expect(() => parseTemplate('test', '<div>{{ }}</div>')).toThrow('[yq:parse] test: empty expression in {{ }}')
})

test('带无效路径的错误处理', () => {
  expect(() => parseTemplate('test', '<div>{{ . }}</div>')).toThrow('[yq:parse] test: invalid path: .')
  expect(() => parseTemplate('test', '<div>{{ user. }}</div>')).toThrow('[yq:parse] test: invalid path: user.')
  expect(() => parseTemplate('test', '<div>{{ .name }}</div>')).toThrow('[yq:parse] test: invalid path: .name')
})

test('带复杂嵌套结构的正确处理', () => {
  const result = parseTemplate('test', '<div class="container"><h1>{{ title }}</h1><p>{{ content }}</p></div>')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 2, partIndex: 0 })
  expect(result.root.children).toHaveLength(2)
  expect(result.root.children[0].text).toEqual([{ path: ['title'] }])
  expect(result.root.children[1].text).toEqual([{ path: ['content'] }])
})

test('带多个属性的正确处理', () => {
  const result = parseTemplate('test', '<input value="{{ form.name }}" placeholder="{{ form.placeholder }}">')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'attr', nodeId: 0, attr: 'value' })
  expect(result.slots[1]).toEqual({ kind: 'attr', nodeId: 0, attr: 'placeholder' })
  expect(result.root.dynAttrs).toEqual({
    value: ['form.name'],
    placeholder: ['form.placeholder']
  })
})

test('带混合静态和动态属性的正确处理', () => {
  const result = parseTemplate('test', '<input class="static" value="{{ form.name }}">')
  expect(result.slots).toHaveLength(1)
  expect(result.slots[0]).toEqual({ kind: 'attr', nodeId: 0, attr: 'value' })
  expect(result.root.staticAttrs).toEqual({ class: 'static' })
  expect(result.root.dynAttrs).toEqual({ value: ['form.name'] })
})

test('带复杂文本混合的正确处理', () => {
  const result = parseTemplate('test', 'Total: ${{ price }} (tax: ${{ tax }})')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 0, partIndex: 3 })
  expect(result.root.text).toEqual([
    { static: 'Total: $' },
    { path: ['price'] },
    { static: ' (tax: $' },
    { path: ['tax'] },
    { static: ')' }
  ])
})

test('带复杂嵌套列表的正确处理', () => {
  const result = parseTemplate('test', '<div><div yq-for="group in groups"><span>{{ group.name }}</span></div></div>')
  expect(result.slots).toHaveLength(2)
  expect(result.slots[0]).toEqual({ kind: 'list', nodeId: 1, itemVar: 'group', itemsPath: ['groups'], keyProp: null })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 1, partIndex: 0 })
  expect(result.root.children[0].list).toEqual({ itemVar: 'group', itemsPath: ['groups'], keyProp: null })
})

test('带多个属性的正确处理', () => {
  const result = parseTemplate('test', '<li yq-for="item in items" class="item" id="item-{{ item.id }}">{{ item.name }}</li>')
  expect(result.slots).toHaveLength(3)
  expect(result.slots[0]).toEqual({ kind: 'list', nodeId: 0, itemVar: 'item', itemsPath: ['items'], keyProp: null })
  expect(result.slots[1]).toEqual({ kind: 'attr', nodeId: 0, attr: 'id' })
  expect(result.slots[2]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.root.dynAttrs).toEqual({ id: ['item.id'] })
})

test('带复杂文本混合的正确处理', () => {
  const result = parseTemplate('test', 'Total: ${{ price }} (tax: ${{ tax }}) - Discount: ${{ discount }}')
  expect(result.slots).toHaveLength(3)
  expect(result.slots[0]).toEqual({ kind: 'text', nodeId: 0, partIndex: 1 })
  expect(result.slots[1]).toEqual({ kind: 'text', nodeId: 0, partIndex: 3 })
  expect(result.slots[2]).toEqual({ kind: 'text', nodeId: 0, partIndex: 5 })
  expect(result.root.text).toEqual([
    { static: 'Total: $' },
    { path: ['price'] },
    { static: ' (tax: $' },
    { path: ['tax'] },
    { static: ') - Discount: $' },
    { path: ['discount'] }
  ])
})

test('parse-demo 登录表单模板解析', () => {
  const loginFormTemplate = `<form class="login-form">
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
    </form>`
  
  const result = parseTemplate('yq-login-form', loginFormTemplate)
  assert.ok(result.slots.length >= 4)
  assert.strictEqual(result.slots.filter(slot => slot.kind === 'text').length, 1)
  assert.strictEqual(result.slots.filter(slot => slot.kind === 'attr').length, 1)
  assert.strictEqual(result.slots.filter(slot => slot.kind === 'bool').length, 2)
})

test('parse-demo 待办列表模板解析', () => {
  const todoListTemplate = `<div class="todo-list">
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
    </div>`
  
  const result = parseTemplate('yq-todo-list', todoListTemplate)
  assert.ok(result.slots.length >= 4)
  assert.strictEqual(result.slots.filter(slot => slot.kind === 'text').length, 2)
  assert.strictEqual(result.slots.filter(slot => slot.kind === 'attr').length, 1)
  assert.strictEqual(result.slots.filter(slot => slot.kind === 'bool').length, 1)
  assert.strictEqual(result.slots.filter(slot => slot.kind === 'list').length, 1)
})