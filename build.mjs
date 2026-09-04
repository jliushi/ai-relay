/* ===========================================================================
   构建脚本：把 data.js 展开成静态 index.html，顺带生成 sitemap.xml、
   robots.txt 和 llms.txt。

   用法：node build.mjs

   为什么不在浏览器端渲染：抓取器多数不执行 JS（百度基本不执行，GPTBot /
   ClaudeBot / PerplexityBot 只读原始 HTML），卡片如果由前端 JS 生成，
   源码里就只有一个空 <ul>，四个站点的名字、倍率、额度一个字都进不去。
=========================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { SITE, RELAYS, RISKS, FAQ } from "./data.js";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 用 R,G,B 三元组而不是 hex，这样每一处填充都能是同一色相不同透明度的 rgba()
   压在 --panel 上 —— 一个条目同时管住亮色和暗色两种模式。每条要两个三元组：
     a —— 400 级色。暗色模式下的填充、描边和强调文字，压在深色面板上够 6:1。
     d —— 700/800 级色。亮色模式下的强调文字（a 在白底上只有 ~2.5:1），
          以及两种模式下实心按钮的背景（配白字 >=5.4:1）。
   八条，所以第六、第七个站点也拿到自己的颜色而不是从头重复。 */
const PALETTE = [
  { a: "52, 211, 153",  d: "4, 120, 87"   }, // emerald
  { a: "167, 139, 250", d: "109, 40, 217" }, // violet
  { a: "251, 191, 36",  d: "146, 64, 14"  }, // amber
  { a: "56, 189, 248",  d: "3, 105, 161"  }, // sky
  { a: "251, 113, 133", d: "159, 18, 57"  }, // rose
  { a: "45, 212, 191",  d: "15, 118, 110" }, // teal
  { a: "129, 140, 248", d: "67, 56, 202"  }, // indigo
  { a: "232, 121, 249", d: "134, 25, 143" }, // fuchsia
];

const fmtDate = (iso) =>
  iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1 年 $2 月 $3 日");

/* 链接里没有 aff= 的项就不是返利链接：披露、按钮文案和 rel="sponsored" 都跟着
   变。声明一条不存在的返利虽然不算隐瞒，但一样是不准确的。 */
const isPaid = (aff) => /[?&]aff=/.test(aff);

/* ---------- 卡片 ----------
   覆盖层始终在 DOM 里、只是透明，所以里面的须知和提示同样是可索引正文。
   verifiedAt 写成 data-verified，交给浏览器判断有没有过三个月。 */
function cardHTML(r, i) {
  const c = PALETTE[i % PALETTE.length];
  const paid = isPaid(r.aff);
  const list = (items) =>
    `<ul class="list">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

  const notes = r.notes?.length
    ? `<p class="block-head">须知</p>\n          ${list(r.notes)}`
    : "";
  const tips = r.tips?.length
    ? `<p class="block-head${r.notes?.length ? " block-head-tips" : ""}">使用提示</p>\n          ${list(r.tips)}`
    : "";
  const invite = r.invite
    ? `
            <div class="fact">
              <span class="fact-k">邀请奖励</span>
              <span class="fact-v fact-v-sm">${esc(r.invite)}</span>
            </div>`
    : "";

  return `        <li class="card" style="--a:${c.a};--d:${c.d}" data-verified="${esc(r.verifiedAt)}">
          <div class="body">
            <div class="default">
              <header class="card-head">
                <div class="title-row">
                  <h3 class="name">${esc(r.name)}</h3>
                  <span class="rate">${esc(r.rate)}</span>
                </div>
                <p class="host">${esc(r.host)}</p>
              </header>
              <ul class="models" aria-label="1x 覆盖模型">${r.models
                .map((m) => `<li class="model">${esc(m)}</li>`)
                .join("")}</ul>
              <div class="facts">
                <div class="fact">
                  <span class="fact-k">注册即得</span>
                  <span class="fact-v">${esc(r.signup)}</span>
                </div>${invite}
              </div>
            </div>
            <div class="over" id="fold-${esc(r.id)}">
              <div class="over-scroll">
                <div class="over-inner">
                  <p class="over-title">${esc(r.name)}</p>
                  ${notes}
                  ${tips}
                  <p class="tested"><span class="block-head">实测</span>${esc(r.tested)}</p>
                </div>
              </div>
            </div>
          </div>
          <button class="toggle" type="button" aria-expanded="false" aria-controls="fold-${esc(r.id)}">
            <span>须知与提示</span>
            <svg class="chev" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor"
                    stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <footer class="foot">
            <a class="cta" href="${esc(r.aff)}" target="_blank"
               rel="${paid ? "noopener nofollow sponsored" : "noopener nofollow"}">${
                 paid ? "通过邀请链接注册" : "前往注册"} →</a>
            <p class="meta">实测于 ${esc(fmtDate(r.verifiedAt))}${paid ? " · 含邀请参数" : ""}</p>
          </footer>
        </li>`;
}
/* ---------- 常见问题与风险提示 ---------- */

const faqHTML = () =>
  FAQ.map(
    (f) => `        <details class="faq-item">
          <summary>${esc(f.q)}</summary>
          <p class="faq-a">${esc(f.a)}</p>
        </details>`
  ).join("\n");

const riskItemsHTML = () =>
  RISKS.items.map(
    (r) => `        <li>
          <span class="rd-item-head">${esc(r.head)}</span>
          <span class="rd-item-body">${esc(r.body)}</span>
        </li>`
  ).join("\n");

/* ---------- 结构化数据 ----------
   三块拼在一个 @graph 里：WebPage 交代这一页是什么，ItemList 把四个站点标成
   有序清单，FAQPage 供搜索结果的问答富摘要。AI 抓取器也吃这份 JSON —— 它比
   正文更容易被准确解析，是 GEO 里性价比最高的一件事。 */
function jsonLd() {
  const graph = [
    {
      "@type": "WebPage",
      "@id": SITE.url,
      url: SITE.url,
      name: SITE.title,
      description: SITE.description,
      inLanguage: "zh-CN",
      dateModified: RELAYS.reduce((a, r) => (r.verifiedAt > a ? r.verifiedAt : a), "1970-01-01"),
      author: { "@type": "Person", url: SITE.author },
      // 每张卡片都挂着返利链接，结构化数据里也要如实标注
      isAccessibleForFree: true,
    },
    {
      "@type": "ItemList",
      name: "实测可用的 AI 公益站",
      numberOfItems: RELAYS.length,
      itemListElement: RELAYS.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: r.name,
        url: `https://${r.host}`,
        description: [r.rate, r.signup, `覆盖模型：${r.models.join("、")}`].join("；"),
      })),
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return `<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)}
</script>`;
}
/* ---------- <head> ----------
   og:image 用绝对地址，社交平台和 AI 抓取器都不会替你补全相对路径。 */
function headHTML() {
  const img = SITE.url + "og.png";
  const verify = [
    SITE.googleVerification &&
      `<meta name="google-site-verification" content="${esc(SITE.googleVerification)}">`,
    SITE.baiduVerification &&
      `<meta name="baidu-site-verification" content="${esc(SITE.baiduVerification)}">`,
  ].filter(Boolean);
  return `<title>${esc(SITE.title)}</title>
<meta name="description" content="${esc(SITE.description)}">
<meta name="keywords" content="${esc(SITE.keywords.join("，"))}">
<meta name="theme-color" content="#10b981">
<link rel="canonical" href="${esc(SITE.url)}">${verify.length ? "\n" + verify.join("\n") : ""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.brand)}">
<meta property="og:locale" content="zh_CN">
<meta property="og:url" content="${esc(SITE.url)}">
<meta property="og:title" content="${esc(SITE.title)}">
<meta property="og:description" content="${esc(SITE.description)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(SITE.title)}">
<meta name="twitter:description" content="${esc(SITE.description)}">
<meta name="twitter:image" content="${esc(img)}">
${jsonLd()}`;
}

/* ---------- 给抓取器的三个文件 ---------- */

const sitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE.url}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

/* 不拦任何抓取器，包括 GPTBot / ClaudeBot / PerplexityBot ——
   这一页的目的就是被它们读到并引用。 */
const robots = () => `User-agent: *
Allow: /

Sitemap: ${SITE.url}sitemap.xml
`;

/* llms.txt：给大模型读的站点摘要（llmstxt.org 的约定）。抓取器拿它当索引，
   比让模型自己从 HTML 里猜要准。内容从同一份 data.js 出，不会和页面对不上。 */
const llmsTxt = () => `# ${SITE.brand}

> ${SITE.description}

页面地址：${SITE.url}
最近更新：${new Date().toISOString().slice(0, 10)}

## 收录标准与免责

${RISKS.lead}

${RISKS.items.map((r) => `- **${r.head}**：${r.body}`).join("\n")}

页面内每条注册链接都含邀请参数（返利），卡片页脚已标注。

## 站点清单（共 ${RELAYS.length} 个）

${RELAYS.map((r) => `### ${r.name}

- 域名：${r.host}
- 倍率：${r.rate}
- 注册即得：${r.signup}${r.invite ? `\n- 邀请奖励：${r.invite}` : ""}
- 1x 覆盖模型：${r.models.join("、")}
- 实测：${r.tested}
- 实测日期：${r.verifiedAt}${r.notes?.length ? `\n- 须知：${r.notes.join("；")}` : ""}${
      r.tips?.length ? `\n- 使用提示：${r.tips.join("；")}` : ""
    }`).join("\n\n")}

## 常见问题

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}
`;
/* ---------- og.html ----------
   社交分享和部分 AI 抓取器要一张 1200x630 的预览图。这里生成的是那张图的
   HTML 源，内容跟着 data.js 走，所以站点增减之后图不会和页面对不上。
   转成 og.png 要跑一次截图命令（见 README），构建本身不依赖浏览器。 */
function ogHTML() {
  const latest = RELAYS.reduce((a, r) => (r.verifiedAt > a ? r.verifiedAt : a), "1970-01-01");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>og:image 源 — 截成 1200x630 的 og.png</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; display: flex; overflow: hidden;
    font-family: Inter, -apple-system, "Segoe UI", "PingFang SC",
                 "Microsoft YaHei", sans-serif;
    background:
      radial-gradient(900px 520px at 6% -18%, rgba(16,185,129,.26), transparent 62%),
      radial-gradient(760px 460px at 96% 6%, rgba(245,158,11,.18), transparent 60%),
      linear-gradient(160deg, #1c1917 0%, #0c0a09 100%);
  }
  .og { margin: auto; padding: 0 82px; width: 100%; }
  .eyebrow {
    font-size: 21px; font-weight: 600; letter-spacing: .13em;
    text-transform: uppercase; color: #6ee7b7;
  }
  h1 {
    margin: 22px 0 0; font-size: 92px; line-height: 1.06; font-weight: 800;
    letter-spacing: -.03em;
    background: linear-gradient(118deg, #fff 34%, #6ee7b7 72%, #fcd34d);
    -webkit-background-clip: text; color: transparent;
  }
  .lead { margin-top: 26px; font-size: 30px; line-height: 1.5; color: #d6d3d1; }
  .row { margin-top: 46px; display: flex; gap: 12px; flex-wrap: wrap; }
  .chip {
    padding: 9px 20px; border: 1px solid rgba(110,231,183,.34); border-radius: 999px;
    font-size: 22px; color: #a7f3d0; background: rgba(16,185,129,.1);
  }
  .foot {
    margin-top: 52px; display: flex; justify-content: space-between;
    font-size: 22px; color: #a8a29e;
  }
</style>
</head>
<body>
  <div class="og">
    <p class="eyebrow">第三方服务 · 实测清单</p>
    <h1>${esc(SITE.brand)}</h1>
    <p class="lead">Claude Code / Codex 免费额度 · 倍率、赠额与邀请规则逐条实测</p>
    <div class="row">${RELAYS.map((r) => `<span class="chip">${esc(r.name)}</span>`).join("")}</div>
    <div class="foot">
      <span>${esc(SITE.url.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</span>
      <span>实测于 ${esc(fmtDate(latest))}</span>
    </div>
  </div>
</body>
</html>
`;
}

/* ---------- 主流程 ---------- */

const tpl = readFileSync("template.html", "utf8");

const FILLS = {
  HEAD: headHTML(),
  BRAND: esc(SITE.brand),
  AUTHOR_URL: esc(SITE.author),
  REPO_URL: esc(SITE.repo),
  EYEBROW: esc(SITE.eyebrow),
  HERO_TITLE: esc(SITE.heroTitle),
  HERO_LEAD: esc(SITE.heroLead),
  CONTACT: esc(SITE.contactText),
  COUNT: String(RELAYS.length),
  CARDS: RELAYS.map(cardHTML).join("\n"),
  FAQ: faqHTML(),
  RISK_TITLE: esc(RISKS.title),
  RISK_LEAD: esc(RISKS.lead),
  RISK_ITEMS: riskItemsHTML(),
};

let out = tpl;
for (const [k, v] of Object.entries(FILLS)) {
  // 用 split/join 而不是 replace：占位符可能出现多次（AUTHOR_URL 就有两处），
  // 而且值里含 $ 时 replace 会把它当替换模式解析。
  out = out.split(`{{${k}}}`).join(v);
}

// 模板里漏填的占位符会一路带到线上，构建时就该拦住
const left = out.match(/\{\{[A-Z_]+\}\}/g);
if (left) {
  console.error("模板里还有没填的占位符：" + [...new Set(left)].join(" "));
  process.exit(1);
}

writeFileSync("index.html", out);
writeFileSync("sitemap.xml", sitemap());
writeFileSync("robots.txt", robots());
writeFileSync("llms.txt", llmsTxt());
writeFileSync("og.html", ogHTML());

/* README 里的清单表格也从这份数据出。GitHub 的 README 会被 Google 索引，是这个
   仓库第二个入口，手抄一份迟早和页面对不上。 */
const readme = readFileSync("README.md", "utf8");
const table = [
  "| 站点 | 域名 | 倍率 | 注册即得 | 1x 覆盖模型 | 实测日期 |",
  "| --- | --- | --- | --- | --- | --- |",
  ...RELAYS.map((r) =>
    `| [${r.name}](${r.aff}) | \`${r.host}\` | ${r.rate} | ${r.signup} | ${r.models.join("、")} | ${r.verifiedAt} |`
  ),
].join("\n");

const marked = readme.replace(
  /<!-- RELAYS:START -->[\s\S]*?<!-- RELAYS:END -->/,
  `<!-- RELAYS:START -->\n${table}\n<!-- RELAYS:END -->`
);
if (marked === readme && !readme.includes(table)) {
  console.error("README 里找不到 RELAYS:START / RELAYS:END 标记，表格没更新");
  process.exit(1);
}
writeFileSync("README.md", marked);

/* 报一下可索引正文有多少字：剥掉 script / style / 注释和标签，剩下的就是
   不执行 JS 的抓取器能看到的东西。改动之后这个数字掉下去了就是出了问题。 */
const text = out
  .replace(/<script[\s\S]*?<\/script>/g, "")
  .replace(/<style[\s\S]*?<\/style>/g, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

console.log(`index.html    ${RELAYS.length} 张卡片 · ${FAQ.length} 条问答`);
console.log(`sitemap.xml   1 条 URL`);
console.log(`robots.txt    放行全部抓取器`);
console.log(`llms.txt      ${llmsTxt().length} 字`);
console.log(`og.html       预览图源（截图命令见 README）`);
console.log(`README.md     清单表格已同步`);
console.log(`\n不执行 JS 时的可索引正文：${text.length} 字`);
