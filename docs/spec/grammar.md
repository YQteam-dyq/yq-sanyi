# yq-sanyi 语法契约

## 组件定义

```ts
yq.define('component-name', {
  style: 'CSS 样式文本',
  template: 'HTML 模板字符串',
  script: function() {} | '字符串脚本' | null
})
```

`script` 段为普通 JS 函数（函数体即行为逻辑，一等公民）；也接受字符串脚本（`new Function` 惰性编译，受 unsafe-eval 约束）或 null。

## 绑定槽语法

### 1. text 槽

文本节点中出现 `{{ path }}`，可多段夹静态文本。

```html
<p>Hi {{ user.name }}! Your score is {{ user.score }}.</p>
```

- 槽表：`{ kind: 'text', nodeId: number, partIndex: number }`
- 静态文本与动态表达式交替出现
- 纯空白静态段丢弃

### 2. attr 槽

属性值**整值恰好**是单个 `{{ path }}`，且属性不在布尔属性集 → 值绑定。

```html
<input value="{{ form.username }}" placeholder="{{ form.placeholder }}">
```

- 槽表：`{ kind: 'attr', nodeId: number, attr: string }`
- 属性值必须整值等于 `{{ path }}`，不支持部分绑定
- 非整值形式抛解析错误

### 3. bool 槽

同 attr 槽，但属性名在**布尔属性集** → 存在性绑定。

```html
<input disabled="{{ isDisabled }}" checked="{{ form.checked }}">
```

- 槽表：`{ kind: 'bool', nodeId: number, attr: string }`
- truthy 置属性并置 property true，falsy 移除属性
- 布尔属性集见下方列表

### 4. list 槽

元素带 `yq-for` 属性 → 列表重复。

```html
<ul>
  <li yq-for="item in items" yq-key="item.id">{{ item.name }}</li>
</ul>
```

```html
<div yq-for="products"></div>
```

- 槽表：`{ kind: 'list', nodeId: number, itemVar: string, itemsPath: string[], keyProp: string | null }`
- 完整语法：`yq-for="itemVar in itemsPath"`
- 省略写法：`yq-for="itemsPath"`（itemVar 默认 `item`）
- 可选 `yq-key="prop"` 作稳定 key，缺省按位置

## 布尔属性集

以下属性自动启用布尔槽语义：

```js
checked disabled hidden selected readonly required autofocus open multiple muted itemscope noshade compact
```

## void 元素集

以下元素无子元素，遇 `>` 即闭合：

```js
area base br col embed hr img input link meta param source track wbr
```

- `<x/>` 自闭合形式对任意 tag 等效
- void 元素禁止有子元素

## 限制

### 路径规则

- 数据路径 = `.` 分隔标识符序列（可含纯数字段）
- 无运算符 / 函数调用
- 禁止空段、`.` 开头结尾

```html
<div>{{ user.name }}</div>
<div>{{ items.0.title }}</div>

<div>{{ user. }}</div>
<div>{{ .name }}</div>
<div>{{ user.name() }}</div>
```

上例第一组为正确路径示例（`{{ user.name }}` 与数字段 `{{ items.0.title }}`）；第二组为错误示例——空段（`{{ user. }}`）、以 `.` 开头（`{{ .name }}`）、函数调用（`{{ user.name() }}`），均会抛解析错误。

### 属性绑定限制

- 属性值含 `{{` 但**非整值** → 抛解析错误
- 不支持部分绑定：`class="{{ c }} {{ d }}"` 抛错

```html
<input value="{{ form.name }}">

<input class="{{ c }} {{ d }}">
```

正确示例为整值属性绑定 `value="{{ form.name }}"`；错误示例 `class="{{ c }} {{ d }}"` 含 `{{` 但非整值（部分绑定），抛解析错误。

### 列表限制

- 列表容器**禁止嵌套 yq-for**
- 根元素不允许是 yq-for 节点

```html
<div>
  <div yq-for="item in items"></div>
</div>

<div yq-for="items"></div>
<div>
  <div yq-for="a in items">
    <div yq-for="b in a"></div>
  </div>
</div>
```

正确示例把单个 `yq-for` 列表放在普通容器内；错误示例一为根元素直接带 `yq-for`，错误示例二为列表容器内部再嵌套 `yq-for`，均被禁止。

### 标签规则

- 模板 trim 后必须以元素开头并以同元素闭合
- 标签必须正确闭合和不匹配

```html
<div><span></span></div>

<div><span></div>
<a></a><b></b>
```

正确示例标签闭合配对；错误示例一标签不匹配（`<span>` 被 `</div>` 闭合），错误示例二为多根元素，均抛解析错误。

### 私有属性

`yq-for` / `yq-key` 为组件私有属性，**不进入** staticAttrs / 不作为槽：

```html
<div yq-for="item in items" yq-key="id" class="static">
  {{ item.name }}
</div>
```

- staticAttrs: `{ class: 'static' }`
- dynAttrs: `{}`
- list: `{ itemVar: 'item', itemsPath: ['items'], keyProp: 'id' }`

### 实体解码

静态文本与静态属性值解码：

```js
&amp; → &
&lt; → <
&gt; → >
&quot; → '
&#39; → '
&nbsp; → 
```

动态属性整值 `{{ }}` 内部不涉及实体解码。

### 错误处理

- 统一错误消息前缀：`[yq:parse] <name>: <说明>`
- 文本节点仅空白静态段丢弃
- 解析错误立即抛出，不静默恢复

## 数据流契约

### 解析产出

```ts
interface Cdo {
  name: string
  root: SNode
  nodes: SNode[]
  styleText: string
  scriptFactory: (() => unknown) | null
  slots: Slot[]
}

interface SNode {
  id: number
  tag: string
  staticAttrs: Record<string, string>
  dynAttrs: Record<string, string[]>
  text: ParsedPart[]
  children: SNode[]
  list: ListSpec | null
}

interface Slot {
  kind: 'text' | 'attr' | 'bool' | 'list'
  nodeId: number
}
```

`Slot` 除公共字段 `kind`/`nodeId` 外还按槽类型携带特定字段：text 槽有 `partIndex`，attr/bool 槽有 `attr`，list 槽有 `itemVar`/`itemsPath`/`keyProp`。

### 缓存机制

- `parseTemplate` 为纯函数（不缓存）
- 缓存发生在 registry：`define` 解析一次存 CDO
- `lookup` 多实例复用同一 CDO 引用

### Phase 4 消费指引

- 槽表供 render 阶段绑定数据
- nodes 数组以 id 直取节点
- scriptFactory 返回行为函数
- styleText 原样供样式处理