# AI 公益站清单

实测可用的第三方 AI 公益站（中转站）清单，含倍率、注册即得额度、邀请规则与须知。
覆盖 Claude Opus 5、Opus 4.8 与 GPT-5.6，可用于 Claude Code 和 Codex。每条都标注实测日期。

**页面：https://jliushi.github.io/ai-relay/**

零构建依赖、纯静态、无服务器。仿 [ijry/ai-switch](https://github.com/ijry/ai-switch)
的 relay 页用原生 HTML/CSS/JS 重写（原项目 MIT 许可）。

## 清单

<!-- RELAYS:START -->
| 站点 | 域名 | 倍率 | 注册即得 | 1x 覆盖模型 | 实测日期 |
| --- | --- | --- | --- | --- | --- |
| [AgentRouter 公益站](https://agentrouter.org/register?aff=76NE) | `agentrouter.org` | 1x 倍率 | 注册即得 $100 额度 | gpt-5.6、opus 5 | 2026-09-04 |
| [justwoker 公益站](https://api.justwoker.icu/register?aff=XiYg) | `api.justwoker.icu` | 0.65x 倍率 | 通过邀请链接注册即得 $70 额度 | opus 4.8、opus 5 | 2026-09-04 |
| [kktoken 公益站](https://kktoken.cc/sign-up?aff=8Zqi) | `kktoken.cc` | 1x 倍率 | 注册即得 $100 额度 | opus 5 | 2026-09-04 |
| [tabitoken 公益站](https://tabitoken.com/sign-up?aff=C8EJ) | `tabitoken.com` | 1x 倍率 | 注册即得 $20 额度 | opus 4.8、opus 5 | 2026-09-04 |
<!-- RELAYS:END -->

上面的表格由 `node build.mjs` 从 `data.js` 生成，不要手改。倍率是相对官方价格的
计费系数：1x 按官方价扣额度，0.65x 只按官方价的 65% 扣，所以同样一笔赠额，
倍率低的站点能跑的 token 更多。

## 用之前先知道

- 收录只代表某个时间点实测能用，**不构成任何形式的担保或推荐承诺**。
- 额度、倍率、邀请规则随时会变，站点也可能限流、跑路或直接关停。
- 公益站能看到你发过去的全部请求内容。涉密代码、生产环境凭据、客户数据不要经
  第三方中转，这跟用哪一家无关。
- 页面内每条注册链接都含邀请参数（返利），卡片页脚已标注。
- 充值、封号、限流这类站点自身的问题只能找站点的支持渠道，本页只做信息汇总。

## 改数据

站点、文案、FAQ、风险提示、配置方法全部在 `data.js` 里，改完跑一次构建：

```bash
node build.mjs
git add -A && git commit -m "update: 实测数据" && git push
```

推上去 GitHub Pages 会自动重新发布，几分钟生效。

新增站点直接往 `RELAYS` 里加一项，配色按数组顺序自动取下一个色（八色循环，
见 `build.mjs` 里的 `PALETTE`）。`aff` 整条贴站点给你的邀请链接——各站注册路径
不一样（`/register` 和 `/sign-up` 都有），照抄，别套用别家的。

`verifiedAt` 距今超过三个月，卡片会自动挂出「信息可能已变化」的提示。这条由浏览器
按访问当天的日期算，会自己越线。看到了就重新实测改日期，或者把该项删掉——不要
只改日期不实测。

链接里没有 `aff=` 的项，页脚不会显示返利披露，按钮也会变成「前往注册」。

## 重新生成预览图

改了标题或站点清单之后，社交分享用的 `og.png` 要重新截一次（`og.html` 已由构建
更新，只差转成图片）：

```bash
chrome --headless=new --window-size=1200,630 \
       --screenshot=og.png og.html
```

Windows 上把 `chrome` 换成 `"C:/Program Files/Google/Chrome/Application/chrome.exe"`。

## 目录

```
data.js         站点清单、配置方法、FAQ、风险提示、站点级文案 —— 唯一数据源，改这里
template.html   页面骨架：全部 CSS 和交互 JS，卡片位置是 {{CARDS}} 占位
build.mjs       node build.mjs
index.html      产物，卡片和 FAQ 已展开成静态标签
sitemap.xml     产物
robots.txt      产物，放行全部抓取器
llms.txt        产物，给大模型读的站点摘要
og.html         产物，og.png 的 HTML 源
og.png          社交分享预览图，1200x630
favicon.svg
```

`index.html` 是产物但要提交进仓库——GitHub Pages 直接服务它，Pages 侧没有构建步骤。

## 为什么要有构建这一步

卡片如果由浏览器端 JS 渲染，页面源码里就只有一个空 `<ul>`，四个站点的名字、
倍率、额度一个字都进不了 HTML。Google 会执行 JS 但优先级低且有渲染预算，百度基本
不执行，GPTBot / ClaudeBot / PerplexityBot 这类抓取器多数只读原始 HTML。

改成构建期展开之后，不执行 JS 时的可索引正文从 454 字变成 4200 字出头，四个站点的
倍率、赠额、邀请规则、须知，以及 Claude Code / Codex 的配置方法全部进入源码。
`build.mjs` 每次运行都会把这个字数打出来，掉下去了就是哪里出了问题。

同一份 `data.js` 还会生成 `llms.txt`（[llmstxt.org](https://llmstxt.org) 的约定，
给大模型读的纯文本摘要）和页面里的 JSON-LD 结构化数据（`WebPage` + `ItemList` +
`FAQPage`），所以页面正文、结构化数据和 LLM 摘要三者不会互相对不上。

## 许可

页面代码 MIT。清单内容是第三方服务的公开信息与个人实测记录，随时可能过期。
