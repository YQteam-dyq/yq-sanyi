# Phase 2 详细策划案 · 三位一体语法与解析（yq-sanyi）

对应：`/workspace/.trae/specs/yq-sanyi/spec.md` §6.2、tasks.md Ph2-T1/T2/T3、checklist.md Phase 2。
本策划案在派发前已将**设计决策全部锁死**：实施者按本文档逐步执行，禁止自行设计、自行扩缩范围、禁止上网搜索。

## 1. 目标与本阶段边界

- 做：parser（解析装配 CDO + 绑定槽预扫描 + 缓存）；H-1 语法形态对比与落定；H-5 脚本执行方式 CSP 实测与落定。
- 不做（后续 Phase 负责，本阶段禁止引入）：
  - 不做任何 DOM 渲染/挂载/更新（Phase 4）；不做生命周期（Phase 6）；不做样式作用域（Phase 5）；不做 devtools（Phase 6）。
  - parser 用**纯文本 tokenizer 实现**，不依赖 DOM/DOMParser，因此 Node 单测无需 DOM。
  - 不新增任何第三方依赖（运行时与 devDependencies 均保持现状：devDeps 仅 typescript + esbuild）。
  - 所有新建/修改的源码、脚本、HTML、docs 代码围栏内**不得出现任何注释**（Y-4）。写代码时不得在正则字面量内写 `//` 形态，字符串内 URL 写法必须带引号（注释扫描器会做字符串遮蔽）。

## 2. 已锁定的设计决策（H-1 主案语法、绑定标记语法、H-5 模型）

### 2.1 组件定义 API（H-1 主案：注册式三段）

`registry.define`（Phase 1 已有）的第二个参数升级为三段对象：

```ts
yq.define('yq-counter', {
  style: 'p { margin: 0 } .c { color: red }',
  template: '<button class="c">{{ count }}</button>',
  script: function () { }
});
```

`script` 行为段为普通 JS 函数（一等公民）；如 2.3 H-5 模型所述，也接受字符串脚本（`new Function` 惰性编译，受 unsafe-eval 约束），函数优先。

- `template`：标准 HTML 字符串，**必须恰好一个元素根**（允许根前后有空白与注释文本，忽略）。
- `style`：标准 CSS 字符串，原样存 CDO（换肤/作用域在 Phase 5 处理）。
- `script`：**函数优先**（不 eval、天然过严格 CSP）；**字符串可选**（Function 惰性编译，受 unsafe-eval 约束，H-5 落定内容）。
- `define(name, src)` 解析一次，产出 CDO 并**缓存**在 registry 条目上；`lookup(name)` 多实例复用同一 CDO 引用。
- 段内只写标准语言：模板内除「绑定标记」（见 2.2）外无私有语法；绑定表达式只允许**数据路径**（点路径），不是任意 JS 表达式。

### 2.2 绑定标记语法（Phase 4 render 会消费槽表，必须与此一致，写进 grammar）

四种槽，全部在 parser 阶段预扫描登记到 slotTable：

1. **text 槽**：文本节点中出现 `{{ path }}`（可多个、可夹静态文本）。例：`Hi {{ user.name }}!` → 段序列 `['Hi ', {path:['user','name']}, '!']`。
2. **attr 槽**：属性值**整值恰好**是单个 `{{ path }}`，且属性不在布尔属性集 → 属性值绑定。例：`value="{{ form.name }}"`。
3. **bool 槽**：同 2，但属性名在**布尔属性集** → 存在性绑定（truthy 置属性并置 property true，falsy 移除）。
4. **list 槽**：元素带 `yq-for` 属性 → 列表重复。语法 `yq-for="p in products"`（itemVar in 数据路径）；省略写法 `yq-for="products"`（itemVar 默认 `item`）。可选 `yq-key="id"`：相对 item 的点路径，作稳定 key；缺省按位置。**列表容器内部禁止再嵌套 yq-for**（解析到即抛错，记录限制，v0 不扩）。

规则与限制（必须遵守并写进 grammar 文档）：
- 数据路径 = 用 `.` 分隔的标识符序列（允许数字下标段，如 `items.0.name`）。不含运算符/函数调用。
- 属性值内含 `{{` 但**非整值** → 抛解析错误（消息：属性绑定仅支持整值形式），不做静默字面量。
- 布尔属性集：`checked disabled hidden selected readonly required autofocus open multiple muted itemscope noshade compact`。
- 文本节点 `{{ path }}` 路径解析失败（如空段、`.` 开头结尾）→ 抛解析错误。
- 根元素扫描到 `yq-for` → 抛错（列表必须是树内节点，不允许根为列表）。
- `yq-for`/`yq-key` 为组件私有属性，**不进入** staticAttrs / 不作为槽，仅消费为 list 描述。

### 2.3 H-5 模型（落定结论预写，实验补证据）

- 主路径：`script` 传函数 → `scriptFactory = () => fn`，全程无 eval，严格 CSP（`script-src 'self'` 无 `unsafe-eval`）可用。
- 次路径：`script` 传字符串 → 首次调用 factory 时 `new Function(...)` 惰性编译；在无 `unsafe-eval` 的 CSP 页面上抛 `EvalError`，由调用方捕获（Phase 6 接 devtools 面板提示）。
- 实验页 `examples/csp-test.html`（meta CSP `script-src 'self'`）真实运行两条路径并输出结果；沙箱无浏览器时如实记录「引擎级事实 + 规范依据」，把浏览器实测标注为待 Phase 7 补跑（禁止编造浏览器输出）。

## 3. 公共 API 与 TypeScript 类型（新增于 packages/core/src，最终从 index.ts 导出）

新文件 `packages/core/src/parser.ts`，导出：

```ts
export interface ParsedPart { static: string } | { path: string[] }
export interface ListSpec { itemVar: string; itemsPath: string[]; keyProp: string | null }
export interface SNode {
  id: number
  tag: string
  staticAttrs: Record<string, string>
  dynAttrs: Record<string, string[]>
  text: ParsedPart[]
  children: SNode[]
  list: ListSpec | null
}
export type Slot =
  | { kind: 'text'; nodeId: number; partIndex: number }
  | { kind: 'attr'; nodeId: number; attr: string }
  | { kind: 'bool'; nodeId: number; attr: string }
  | { kind: 'list'; nodeId: number; itemVar: string; itemsPath: string[]; keyProp: string | null }
export interface Cdo {
  name: string
  root: SNode
  nodes: SNode[]
  styleText: string
  scriptFactory: (() => unknown) | null
  slots: Slot[]
}
export function parseTemplate(name: string, template: string): { root: SNode; nodes: SNode[]; slots: Slot[] }
export function createScriptFactory(script: unknown): (() => unknown) | null
```

- `parseTemplate` 是**纯函数**（不缓存）；缓存发生在 registry：`define` 解析一次并把 CDO 存条目；`lookup` 返回含 CDO 的条目，多实例共享同一对象。
- `registry.ts` 修改：条目类型携带 `src`（三段）与 `cdo`；`define` 内调用 `parseTemplate` + `createScriptFactory`；`lookup` 返回对象 `{ name, cdo }`。
- `index.ts` 追加导出：`parseTemplate`、`createScriptFactory`、以及类型 `Cdo/SNode/Slot/ListSpec/ParsedPart`（供外部构建工具/文档引用）。
- 脚本函数签名暂不定义调用约定（Phase 4/6 定），`scriptFactory()` 现阶段仅用于 H-5 实验与单测验证「可被调用/抛错语义」。

## 4. 文件级改动清单（按此顺序执行）

1. `packages/core/src/parser.ts`（新建，主体）
2. `packages/core/src/registry.ts`（改：条目 + cdo + define/lookup 逻辑）
3. `packages/core/src/index.ts`（改：导出追加）
4. `packages/core/test/parser.test.mjs`（新建，见 §6）
5. `package.json`（改：`test` 脚本扩为 `node --test packages/core/test/`，确保新测试被发现；先读当前值确认）
6. `examples/parse-demo.html`（新建，见 §7）
7. `docs/spec/grammar.md`（新建：2.2 绑定语法 + 限制，作为 Phase 4 消费契约；代码示例不得含注释）
8. `examples/prototypes/form-a.html`、`examples/prototypes/form-b.html`（新建，H-1 对比原型，见 §8）
9. `docs/decisions/H-1.md`、`docs/decisions/H-5.md`（新建，结论归档，见 §8/§9）
10. `examples/csp-test.html` + `examples/csp-test-app.js`（新建，H-5 实验，见 §9）

不修改：scoper/devtools 包、bench、scripts/* 各检测脚本、tsconfig、lockfile（除非 npm 自动变更，禁止新增依赖）。

## 5. parser 实现要点（tokenizer + 装配，直接照做）

- 实现一个**手写极简 tokenizer**，无正则大法、无状态机外挂库。状态序列：
  data → tagOpen(`<`) → tagName → 判定 endTag/comment/self-closing → beforeAttrName → attrName → afterAttrName → beforeAttrValue → attrValue(双引号/单引号/无引号) → 归位 data。
  注释 `<!-- -->` 跳过（不计为文本）。`<!DOCTYPE` 等声明跳过。实体：解码 `&amp; &lt; &gt; &quot; &#39; &nbsp;`（静态文本与静态属性值都要解码；动态属性整值 `{{ }}` 内部不涉及实体）。
- 段级别拆分：文本内容按 `{{` 与 `}}` 切分（先找 `}}` 再找 `{{` 的顺序处理：遇 `{{` 找最近 `}}`，缺 `}}` 抛错）。切出的表达式 trim 后按 `.` 分段，校验段非空、不含空白/非法字符（允许字符集 `[A-Za-z0-9_$]`，数字段必须全数字）。
- SNode.id：解析内单调自增（从 0 起），`nodes` 数组按下标与 id 一一对应（id 即数组下标，约定写死），render 阶段直接 `nodes[id]`。
- 每个节点产出：tag、staticAttrs（string→string）、dynAttrs（attr 名→数据路径段数组，槽表从它展开：布尔集命中→bool 槽，否则 attr 槽）、text 段序列（文本节点 tag 为 `#text` 概念或并入父？——采用**文本不入树**：文本只作为所在元素的 `text` 段序列与 `textSlots`，避免为文本建节点；空文本段丢弃）、children、list。
- 属性解析：先整体收集 attr 名/值；`yq-for` 值解析出 itemVar/itemsPath/keyProp（`yq-key` 单独读）；`{{` 整值检测对非 yq-for/yq-key 的其余属性。
- 列表校验：解析中维护「当前是否处于某 list 容器子树」标志；子树内再次出现 `yq-for` → 抛错。
- 树校验：模板 trim 后必须以元素开头并以同元素闭合；统计根元素数，非 1 → 抛错；结束标签与最近未闭合标签名不匹配 → 抛错（消息含 tag 名与大致位置：给出「第 N 个字符附近」）。
- void 元素集：`area base br col embed hr img input link meta param source track wbr`（无子、遇 `>` 即闭合，endTag 不期待）；`<x/>` 自闭合形式对任意 tag 等效。
- 错误消息统一 `[yq:parse] <name>: <说明>` 前缀。
- 空白文本处理：元素 text 段序列中「仅空白」静态段丢弃，不产生槽。

## 6. 单测清单（packages/core/test/parser.test.mjs，node:test，零依赖）

用例名与断言（可微调命名，断言必须覆盖到）：
1. `text slot 基本路径与混合静态文本` — `Hi {{ user.name }}!` → 1 个 text 槽、partIndex 正确；root.text 三段。
2. `attr 槽整值绑定` — `value="{{ form.name }}"` → attr 槽 attr=`value`；staticAttrs 不含 value。
3. `bool 槽布尔属性集` — `disabled="{{ isDisabled }}"` → bool 槽；`class="x {{ c }}"`（非整值）→ 抛错。
4. `list 槽完整语法` — `<ul><li yq-for="p in products" yq-key="id">{{ p.name }}</li></ul>` → 1 个 list 槽：itemVar=p、itemsPath=[products]、keyProp=id；li 下 1 个 text 槽。
5. `list 省略写法` — `yq-for="products"` → itemVar 默认 item。
6. `列表内嵌套列表抛错` — 双 yq-for → 抛错且消息含 [yq:parse]。
7. `多根抛错 / 空模板抛错` — `<a></a><b></b>` 与 `''` → 抛错。
8. `标签不闭合与不匹配` — `<div><span></div>` → 抛错。
9. `void 与自闭合` — `<img src="a.png">` 后跟 `<br>` → 正常解析、img 无子。
10. `实体解码` — 静态文本 `A &amp; B` → 静态段值含 `&`。
11. `style 原样保留` — define 后 cdo.styleText 全等输入（含换行）。
12. `script 函数路径 factory 返回同一函数` — factory() 返回原函数。
13. `script 字符串路径编译` — `createScriptFactory('return 1')` 调用返回 1；非法串抛 SyntaxError 被 try 捕获并断言。
14. `define 解析一次缓存 & 多实例复用同一 CDO` — define 后 lookup 两次 → `strictEqual` 同 cdo 对象；重复 define 同名抛错（沿用 Phase 1 语义）。
15. `dynAttrs 与 yq-for 不入 staticAttrs` — 断言上述私有属性不出现。
16. `错误消息前缀` — 上述任一抛错消息以 `[yq:parse]` 开头。

## 7. 验收演示 examples/parse-demo.html（真实组件：表单 + 列表）

- 无构建、无模块：两个 `<script>` 普通标签顺序引 `../../packages/core/dist/core.global.js` 与 `parse-demo-app.js`（页面内联脚本被 Y-4 扫描覆盖？HTML 内 `<script>…</script>` 内容在扫描范围内——因此**把业务 JS 放到独立 .js**，HTML 只留标签，规避注释检测与内联歧义）。
- app 中：`yq.define('yq-login-form', {template: 表单骨架(含 `{{ form.name }}` 整值 value、`{{ status }}` 文本、disabled bool 槽), style, script: fn})`；`yq.define('yq-todo-list', {template: 列表（yq-for + yq-key + 文本槽）, style, script: fn})`。
- 解析结果输出到 DOM：每组件显示 cdo.slots 数量/类型清单、nodes 数、styleText 字节数、scriptFactory 可调用性；`lookup` 两次同引用做页面自检并输出 PASS/FAIL。
- file:// 直开可运行；脚本末尾把自检布尔写进 `<pre id="result">`。

## 8. H-1 语法形态对比（Ph2-T2）

- `examples/prototypes/form-a.html`：主案（注册式 `yq.define(name,{template,style,script})`）——定义两个小组件并把 CDO 摘要打印到页面。
- `examples/prototypes/form-b.html`：对比案（文档内 `<template data-yq="x">` 就地写 `<style>` + `<script type="text/plain">` + 结构；页面 bootstrap 在独立 js 里手动取 template.content 三段文本再调 `yq.define`，展示「显式就近注册、非全文档预扫描」模式）。同样打印 CDO 摘要。
- 两者都必须 file:// 可运行（无 fetch、无模块导入）。
- `docs/decisions/H-1.md`：写对比表（评价维度：file:// 可用性 / 是否整文档预扫描 / 贴近 Web 标准程度 / 可测试性 / 首屏解析成本 / 作者心智负担），结论锁定 **A 注册式为主案**，B 作为「模板就近组织」的可选模式指引（不新增核心 API，由页面自己拆三段）。附两原型路径与各自真实输出摘录。

## 9. H-5 实验与落定（Ph2-T3）

- `examples/csp-test.html`：`<meta http-equiv="Content-Security-Policy" content="script-src 'self'">`；只引外部脚本 `csp-test-app.js`（无内联脚本）。
- `csp-test-app.js` 逻辑：结果写进 `#out`（textContent，禁止 innerHTML 写动态字符串之外的注入面）：
  1) 函数式组件 define → factory() 调用 → 成功标记；
  2) 字符串式组件 define → factory() 在 try/catch 中调用 → 记录成功或抛错（`EvalError`/`Error: Refused to evaluate` 等原文）；
  3) 直接 `new Function('return 1')()` try/catch 结果原文记录。
- 浏览器实测：执行 `which chromium chromium-browser google-chrome google-chrome-stable chrome`；有则 headless 跑 `--dump-dom file://.../csp-test.html` 截取 #out 文本写入 H-5.md；没有则如实写「沙箱无浏览器，引擎级事实：Function 构造在 Node 可用；CSP 无 unsafe-eval 时 Function 被拒为规范语义（CSP3 §6.6.2）」并把浏览器实测标为 Phase 7 补跑项（路径留好）。
- `docs/decisions/H-5.md`：背景 / 实验方法与产物路径 / 真实结果 / 结论（默认函数式一等公民；字符串路径 Function 惰性编译、依赖 unsafe-eval，页面报错文案由调用方捕获）。

## 10. 验证命令（全部真实运行并留输出）

1. `npm install`（确认无新依赖进入 package-lock 的 dependencies；devDeps 仅 typescript/esbuild）
2. `npm run build`（core 产物含 parser；global 与 esm 都出）
3. `npm run typecheck`
4. `npm test`（旧 registry 用例 + 新 parser 用例全绿）
5. `npm run bench`
6. `npm run ci:all`（含 check-deps / check-gzip / check-no-comments 全绿）
7. `node scripts/serve.mjs`（后台）→ `curl -s -o /dev/null -w "%{http_code}"` 依次探 `/examples/parse-demo.html`、`/examples/prototypes/form-a.html`、`/examples/prototypes/form-b.html`、`/examples/csp-test.html`、`/examples/csp-test-app.js` → 全部 200；随后停服。
8. 如存在浏览器：headless dump-dom 取 csp-test 结果（见 §9）。

## 11. 收尾核对（DoD ↔ 验收映射）

| tasks.md | 验收 | 本文档对应 |
| --- | --- | --- |
| Ph2-T1 | 表单+列表真实组件无构建解析通过 | §7 parse-demo（经 curl 200 + 页面自检逻辑在 app js 内可被单测等价覆盖：补充 1 条 node 用例解析与 demo 相同模板字符串并断言槽数） |
| Ph2-T1 | 解析模块依赖图零第三方包 | check-deps 全绿（§10.6） |
| Ph2-T2 | H-1 结论归档 | §8 两原型 + docs/decisions/H-1.md |
| Ph2-T3 | H-5 结论归档 | §9 + docs/decisions/H-5.md |

补充：为覆盖「parse-demo 模板可解析」可在单测复制 demo 的两段 template 文本断言无抛错且槽数 ≥ 预期（防止页面与 parser 脱节）。

## 12. 偏差处理

- 遇到本文档未定义的情况：**不做创造性设计**；选最小保守行为并在最终报告中单列「偏差记录」（含位置、选择、理由），不得静默偏离。
- 任何一步真实失败（如 esbuild 报错、单测红）：停下修到绿再继续，禁止跳过或注释掉失败断言。
- 全程禁止 web 搜索、禁止引入新依赖、禁止写注释（含临时代码）；临时文件用后即删。
