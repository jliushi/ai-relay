# 公益站清单

单页静态站，无构建步骤、无服务器。仿 [ijry/ai-switch](https://github.com/ijry/ai-switch)
的 relay 页重写（原项目 MIT 许可）。

## 改成你自己的信息

三处，都在 `index.html` 里：

| 改什么 | 在哪 |
| --- | --- |
| 站点清单（名称、倍率、额度、邀请规则、须知） | 底部 `<script>` 里的 `RELAYS` 数组 |
| 邀请链接 | `RELAYS` 里每项的 `aff` — 把 `你的邀请码` 换成你自己的 |
| 标题、署名、GitHub 链接 | `<header class="topbar">`、`<section class="hero">`、`<footer class="site-foot">` |

邀请码要先去各站注册，在站内「邀请 / 推广 / Referral」页面拿。

各站的注册路径不一样（`/register?aff=` 和 `/sign-up?aff=` 都有），只替换 `aff=` 后面那段，
别整条 URL 覆盖掉。清单里 zzzcoding 本来就没有邀请机制，所以它没有占位符。

页脚的「含邀请参数」、按钮文案和 `rel="sponsored"` 都按链接里有没有 `aff=` 自动决定：
加一个没有邀请机制的站点，它不会显示返利披露，按钮也会变成「前往注册」。

新增站点直接往 `RELAYS` 里加一项，配色自动按顺序取下一个色（八色循环，见 `PALETTE`）。

## 本地预览

双击 `index.html` 即可。或者起个本地服务：

```bash
npx serve .
```

## 部署到 GitHub Pages

```bash
git init && git add . && git commit -m "init"
gh repo create <仓库名> --public --source=. --push
gh api -X POST repos/{owner}/<仓库名>/pages -f "source[branch]=main" -f "source[path]=/"
```

几分钟后访问 `https://<用户名>.github.io/<仓库名>/`。

之后改完直接 `git push`，Pages 会自动重新发布。

## 两个不要删的东西

- 卡片页脚的「含邀请参数」和链接上的 `rel="nofollow sponsored"` —— 这是返利披露，
  删掉就变成隐瞒返利。
- 「先读这一段」风险提示 —— 里面写明了收录不等于担保、公益站能看到你的全部请求内容。

## 自己维护数据的规则

`verifiedAt` 距今超过三个月，卡片会自动挂一条「信息可能已变化」的提示。这是按访问时的
当前日期算的，会自己越线。看到提示就重新实测改日期，或者把该项删掉 —— 不要只改日期不实测。
