# 讲义制作规范

本站用 VitePress 构建。每一讲 = 一个 Markdown 文件 + 一个原图文件夹 + 若干本讲专用的交互组件。范本是 `lectures/01.md`，写之前请通读一遍。

## 目录约定

| 内容 | 位置 |
|---|---|
| 课件 PDF（不进仓库） | 上一级目录 `Slides/<编号>.pdf`，第 1 讲另有 `Slides/01-AI.pdf`（AI 扩充版） |
| 作业 PDF（不进仓库） | 上一级目录 `Assignments/HW1.pdf` … |
| 正文 | `lectures/<编号>.md`，如 `lectures/02.md` |
| 原图 | `public/img/<编号>/`，文件名 `p<三位页码>[abcd].jpg/png/webp`，正文引用为 `/img/<编号>/p012.jpg` |
| 本讲交互组件 | `.vitepress/theme/components/L<编号><名字>.vue`，如 `L02Lagrange.vue`（必须放在 components 根目录，会被自动全局注册） |
| 本讲工具函数 | `.vitepress/theme/lib/l<编号>.ts` |

**不要修改共享文件**：`config.mts`、`custom.css`、`index.ts`、`Layout.vue`、`lib/store.ts`、`lib/page.ts`、`lib/plot.ts`、`index.md`，以及 components 下不带 `L<编号>` 前缀的组件，还有别的讲的文件。侧栏、首页和上一讲/下一讲链接由统稿人统一更新。可以 import 使用共享 lib 里的函数；如果需要新的通用函数，写进自己的 `lib/l<编号>.ts`。

## 内容要求

1. **全中文**，术语首次出现时附英文（`<span class="en">Condition number</span>`）。
2. **原图全部搬过来**：课件中每一张位图都要出现（同一张图在逐步展开的多页里重复出现时只放一次）。用 PyMuPDF 提取，带透明通道的图要合并 smask；最长边超过 1600px 的缩小；有透明通道的存 `.webp`，其余存 `.jpg`（quality 86）。同一页有多张图时加 a/b/c/d 后缀。
3. **矢量图**（本课课件大多是 TikZ 画的函数图、区间图、流程图）：按页裁剪截图（`page.get_pixmap(dpi=200, clip=rect)`，存 `.jpg` quality 90），或用 SVG / 交互组件重画，二选一，不能漏。课件不同页上画的是同一张示意图（只是换了画法）时只放一张。
4. **不遗漏知识点，但不是原样搬运**：每个定义、定理、证明、例子、思考题、脚注都要有。课件里重复、啰嗦、影响连贯性的部分要合并成一处：逐步展开的重复页、同一结论换个说法再讲一遍、前后两页重复铺垫。合并是为了顺，不是为了短，不要为了缩短篇幅删知识点。
5. **页码标签**：每个小节、定义框、图都标原课件 PDF 页码（PDF 的物理页码，从 1 开始，不是幻灯片角标）。普通版写 `P12`，AI 扩充版写 `A12`（页面上显示为 `AI·P12`）。
6. 课件的思考题、“先猜一猜”和“一分钟检查”做成 `::: qa`（先问后答）。`qa` 框的正文整块是答案，打开前会被模糊遮住；题目需要的代码、公式、图要放在 `::: qa` **之前**，标题里写“上面这段……”。
7. 自己补充的解释要标“补充说明”。发现课件有错或不严谨的地方，保留原文并用灰字注释，不要直接改。
8. 每节末尾加 `::: tldr` 一句话总结，全讲最后放“★ 本讲速记”（`:::: recap`）和参考文献。
9. 证明要写完整的推导步骤，每一步说明依据。
10. 正文不要引用读者看不到的文件（本地笔记、未公开的资料等）。
11. **作业题浅插**：读 `Assignments/` 下的作业，凡是考到本讲知识点的题，在对应小节末尾放一个作业框：

    ```md
    ::: exam [作业] HW1 问题 2：根对系数扰动的敏感性
    题意一两句（题目本身是中文的，照原意转述，可以略去冗长条件）。
    **用到**：本节的 …（哪个定义 / 定理 / 技巧）；**思路方向**：一两句提示。
    :::
    ```

    只给方向，不给完整解答。一道大题的不同小问分属不同小节时，分开放。

## Markdown 语法

```md
<div class="lec-kicker">NUMERICAL METHODS · LECTURE 02</div>

# 插值

<p class="lead">一段导语。</p>

<Chips :items="['来源：计算方法2-2026Fall.pdf（55 页）', 'N 个交互演示', '阅读约 X 分钟']" />

<div class="ctrl"><RevealAll /><span class="muted" style="font-size:13px">图例：<span class="src">P12</span> 为原课件 PDF 页码 · Q 卡片先想再看 · 点击图片可放大</span></div>

<div class="part-label">PART 1 · 标题</div>

## 2.1 小节标题

::: def 定义名 @P12–13          （def / prin / ex / warn / exam 五种框）
内容，可以有 $公式$ 和列表
:::

::: ex [自定义标签] 标题 @P20
:::

::: qa 问题文字 @P30–31
答案
:::

::: tldr
一句话总结
:::

:::: recap
::: card 卡片标题
- 要点
:::
::::

行内页码：<Src p="18–19" />（AI 版：<Src p="A18" />）
图片：<Fig src="/img/02/p010.jpg" cap="说明" p="10" />      size="sm" / "md" 可选
并排：
<FigGrid>
<Fig ... />
<Fig ... />
</FigGrid>
交互组件：<L02Lagrange />（单独一行，前后空行）
```

注意事项：
- 正文中不要出现 `{{`（会被 Vue 当作插值）。
- 加粗的句号、冒号等标点放在 `**` 外面：写 `**也不够**。同一个…`，不要写 `**也不够。**同一个…`。后者 `**` 紧跟中文标点、后面又直接接汉字，Markdown 不认作加粗结束，页面上会露出星号。
- 小节标题用 `## 2.1 …`、`### 2.1.1 …` 编号，编号前缀用本讲的讲号。
- 公式用 `$…$` 和 `$$…$$`（构建时由 MathJax 渲染）。

## 交互组件规范

- 用 `<Widget title="标题">` 包裹，内部用全局样式类：`.ctrl`、`.btn`、`.btn.primary`、`.seg`（按钮组，选中项加 `.on`）、`.out`（输出框，可加 `.prose`）、`.stats` / `.stat`、`.cell`、`.mini-table`、`.widget-note`。
- 颜色一律用 CSS 变量（这样才能跟随深色模式）：`var(--accent)`、`var(--accent-soft)`、`var(--ink)`、`var(--ink-2)`、`var(--ink-3)`、`var(--line)`、`var(--line-2)`、`var(--paper)`、`var(--vp-c-bg)`、`var(--ex)`、`var(--warn)`、`var(--prin)`，以及对应的 `-bg`。SVG 里要写成 `style="fill:var(--accent)"`，不能用 `fill="var(...)"`。
- 函数图像用 `lib/plot.ts` 的坐标变换（`makeScale`、`pathOf`），保持各讲坐标图风格一致。
- 不要在 setup 顶层访问 `window` / `document`（构建时会做服务端渲染），需要时放进 `onMounted`。
- **算法必须真跑**：牛顿迭代、插值、QR、幂迭代等在浏览器里真算，输出的数值要和课件例子对得上（写完后核对一遍）。
- 组件应当真正帮助理解：演示一个过程、让读者动手改参数看结果、或者直观比较两个算法。每讲 3–8 个，宁缺毋滥。
- 范例：`L01Cobweb.vue`（迭代动画 + 可调参数）、`L01Newton.vue`（逐步动画 + 误差表）、`L01Conditioning.vue`（拖动参数看敏感性）。

## 自检

完成后在 `site/` 下运行：

```bash
npx vitepress build
```

必须构建通过、无报错。再用 grep 确认：正文没有残留的 `:::` 语法错误；引用的每张图都在 `public/img/<编号>/` 下存在；提取出的每张图都在正文里被引用。
