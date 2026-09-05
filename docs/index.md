# yq-sanyi

从零自研「HTML/CSS/JS 三位一体」Web 前端框架工程仓库。monorepo 结构：packages/core、packages/scoper、packages/devtools，配套 examples/、bench/、docs/。

## 工程规范

- 运行期零第三方依赖，只站于 Web 平台标准之上
- 全部源码与示例（含本仓库 docs 代码块）不写任何注释，行为由自说明命名与本仓库文档承载
- 产物依赖图校验、core gzip 体积钩子、注释检测均入 CI（scripts/check-*.mjs）

## 目录

| 路径 | 内容 |
| --- | --- |
| packages/core | 内核：registry 起步（define / lookup），Phase 1 双产物链 |
| packages/scoper | 样式作用域模块骨架（Phase 5 实现） |
| packages/devtools | 调试面板模块骨架（Phase 6 实现） |
| examples | 普通 HTML 示例，直接 script 引入产物 |
| bench | 性能基准占位（首屏 / 更新延迟 / 帧率） |
| docs | 文档 |

## 快速验证

```bash
npm install
npm run ci:all
```

删除 node_modules 后 core 产物与示例页仍不依赖任何包管理器产物，此即 G-1 基线。

```bash
rm -rf node_modules
npm run serve
```

## 注册表用法

core 以普通 script 标签引入后，注册表通过 window.yq 全局暴露。

```html
<script src="../packages/core/dist/core.global.js"></script>
<script>
window.yq.define('demo-pill', { name: 'demo-pill' });
const found = window.yq.lookup('demo-pill');
</script>
```

## npm scripts

| 脚本 | 动作 |
| --- | --- |
| build | esbuild 产出 core ESM 与 IIFE 双产物 |
| typecheck | tsc --noEmit |
| test | node:test 运行自动化用例 |
| bench | 运行性能基准占位 |
| ci:all | build + typecheck + test + bench + 三项 CI 检查 |
