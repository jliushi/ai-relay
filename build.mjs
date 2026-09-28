/* ===========================================================================
   构建脚本：把 data.js 展开成静态 index.html，顺带生成 sitemap.xml、
   robots.txt 和 llms.txt。

   用法：node build.mjs

   为什么不在浏览器端渲染：抓取器多数不执行 JS（百度基本不执行，GPTBot /
   ClaudeBot / PerplexityBot 只读原始 HTML），卡片如果由前端 JS 生成，
   源码里就只有一个空 <ul>，四个站点的名字、倍率、额度一个字都进不去。
=========================================================================== */

import { readFileSync, writeFileSync } from "node:fs";
import { SITE, RELAYS, RISKS, FAQ, SETUP, OFFICIAL_FREE, GUIDE, EXPLAINER } from "./data.js";

const PAGES = [GUIDE, EXPLAINER];

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
/* 倍率和赠额从文案里解析，不另设字段 —— 两份数据分开写迟早对不上。解析不出来
   就返回 null，页面上显示「—」，不猜。
   等效可用量 = 赠额 ÷ 倍率。这是全页唯一一处原创计算，页面和 llms.txt 共用它。 */
function rankRelays() {
  const num = (s, re) => {
    const m = String(s).match(re);
    return m ? parseFloat(m[1].replace(/,/g, "")) : null;
  };
  return RELAYS.map((r) => {
    const mult = num(r.rate, /([\d.]+)\s*x/i);
    const credit = num(r.signup, /\$\s*([\d,.]+)/);
    return { r, mult, credit, eff: mult && credit ? credit / mult : null };
  }).sort((a, b) => (b.eff ?? -1) - (a.eff ?? -1));
}

/* ---------- 「怎么挑」对比表 ---------- */
function pickHTML() {
  const rows = rankRelays();
  const money = (n) => "$" + (Number.isInteger(n) ? n : n.toFixed(1));

  const tbody = rows
    .map(({ r, mult, credit, eff }) => `            <tr>
              <th scope="row">${esc(r.name)}</th>
              <td>${credit == null ? "—" : esc(money(credit))}</td>
              <td>${mult == null ? "—" : esc(mult + "x")}</td>
              <td class="cmp-eff">${eff == null ? "—" : esc((Number.isInteger(eff) ? "" : "≈ ") + money(eff))}</td>
            </tr>`)
    .join("\n");

  // 要点也从数据里推，站点增减或须知改了文案会跟着变
  const named = (list) => list.map((r) => r.name).join("、");
  const gpt = RELAYS.filter((r) => r.models.some((m) => /gpt/i.test(m)));
  const ccOnly = RELAYS.filter((r) => (r.notes || []).some((n) => /只支持\s*Claude Code/i.test(n)));
  const checkin = RELAYS.filter((r) =>
    [...(r.notes || []), ...(r.tips || [])].some((x) => /签到/.test(x)));

  const points = [];
  if (gpt.length)
    points.push(`要跑 GPT 系模型的话，覆盖到的是 ${named(gpt)}，其余几家只有 Claude。`);
  if (ccOnly.length)
    points.push(`${named(ccOnly)}标了只支持 Claude Code，不要拿去接 Codex —— 它只转了 Anthropic 那套接口，接上只会拿到一串报错。`);
  if (checkin.length)
    points.push(`${named(checkin)}有每日签到，能小幅补额度，具体数额写在各张卡片的「使用提示」里。`);
  points.push("别把某一家当唯一入口。公益站限流、改规则、直接关站都很常见，手上多备一两个，切换成本几乎为零。");

  return `      <p class="pick-lead">「送多少」不是唯一指标。倍率决定同一笔额度实际能跑多少 token，所以真正该比的是<strong>赠额除以倍率</strong>——下表按这个等效可用量从高到低排。</p>
      <div class="table-wrap">
        <table class="cmp">
          <caption>按等效可用量排序（等效可用量 = 注册赠额 ÷ 倍率）</caption>
          <thead>
            <tr><th scope="col">站点</th><th scope="col">注册赠额</th><th scope="col">倍率</th><th scope="col">等效可用量</th></tr>
          </thead>
          <tbody>
${tbody}
          </tbody>
        </table>
      </div>
      <ul class="pick-list">
${points.map((p) => `        <li>${p}</li>`).join("\n")}
      </ul>`;
}

/* ---------- 配置方法 ----------
   代码块用 <pre><code>，不做语法高亮：高亮要么塞一个库进来，要么在构建期生成
   一堆 <span>，两种都不值得 —— 这几行配置本身就没有需要着色的结构。 */
function setupHTML() {
  const steps = SETUP.steps
    .map((s, i) => `        <li class="setup-step">
          <div class="setup-head">
            <span class="setup-n">${i + 1}</span>
            <h3 class="setup-title">${esc(s.title)}</h3>
          </div>
          <p class="setup-body">${esc(s.body)}</p>
          <pre class="setup-code"><code>${esc(s.code)}</code></pre>
          <p class="setup-note">${esc(s.note)}</p>
        </li>`)
    .join("\n");

  return `      <p class="pick-lead">${esc(SETUP.lead)}</p>
      <ol class="setup-list">
${steps}
      </ol>
      <h3 class="setup-pit-head">常见坑</h3>
      <ul class="pick-list">
${SETUP.pitfalls.map((p) => `        <li>${esc(p)}</li>`).join("\n")}
      </ul>`;
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

/* ---------- 跑路保底：官方免费层 ----------
   外链到官方，不带返利，所以 rel 只用 noopener，不加 sponsored。 */
function officialFreeHTML() {
  const items = OFFICIAL_FREE.items
    .map((it) => `        <li class="of-item">
          <a class="of-name" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.name)} →</a>
          <span class="of-note">${esc(it.note)}</span>
        </li>`)
    .join("\n");
  return `      <p class="pick-lead">${esc(OFFICIAL_FREE.lead)}</p>
      <ul class="of-list">
${items}
      </ul>
      <p class="of-source">${esc(OFFICIAL_FREE.source.replace(/itsfree\.ai/, ""))}<a href="${esc(OFFICIAL_FREE.sourceUrl)}" target="_blank" rel="noopener">itsfree.ai</a>。</p>`;
}

/* ---------- 结构化数据 ----------
   拼在一个 @graph 里，节点之间用 @id 互相引用：
     WebSite   —— 整个站是什么，挂 publisher。
     Person    —— 作者/发布者，sameAs 指向 GitHub，把这一页和一个实体绑定。
     WebPage   —— 这一页是什么，isPartOf 指回 WebSite，about/mentions 交代
                  它讲的是哪些实体（AI 公益站、Claude Code、Codex、各模型）。
     HowTo     —— 「配置方法」那一节的机读版。配置步骤是本页原创、高检索意图的
                  内容，标成 HowTo 后能进搜索结果的步骤富摘要，也最容易被 AI 引用。
     ItemList  —— 四个站点的有序清单。
     FAQPage   —— 供搜索结果的问答富摘要。
   AI 抓取器也吃这份 JSON —— 它比正文更容易被准确解析，是 GEO 里性价比最高的一件事。 */
function jsonLd() {
  const dMod = RELAYS.reduce((a, r) => (r.verifiedAt > a ? r.verifiedAt : a), "1970-01-01");
  const dPub = RELAYS.reduce((a, r) => (r.verifiedAt < a ? r.verifiedAt : a), "9999-12-31");
  const img = SITE.url + "og.png";
  const models = [...new Set(RELAYS.flatMap((r) => r.models))];

  const person = { "@type": "Person", "@id": SITE.url + "#author" };
  person.name = SITE.authorName;
  person.url = SITE.author;
  person.sameAs = [SITE.author];

  const graph = [
    {
      "@type": "WebSite",
      "@id": SITE.url + "#website",
      url: SITE.url,
      name: SITE.brand,
      description: SITE.description,
      inLanguage: "zh-CN",
      publisher: { "@id": person["@id"] },
    },
    person,
    {
      "@type": "WebPage",
      "@id": SITE.url,
      url: SITE.url,
      name: SITE.title,
      description: SITE.description,
      inLanguage: "zh-CN",
      isPartOf: { "@id": SITE.url + "#website" },
      datePublished: dPub,
      dateModified: dMod,
      author: { "@id": person["@id"] },
      publisher: { "@id": person["@id"] },
      primaryImageOfPage: { "@type": "ImageObject", url: img, width: 1200, height: 630 },
      keywords: SITE.keywords.join("，"),
      about: [
        { "@type": "Thing", name: "AI 公益站" },
        { "@type": "Thing", name: "AI 中转站" },
      ],
      mentions: [
        { "@type": "SoftwareApplication", name: "Claude Code", applicationCategory: "DeveloperApplication" },
        { "@type": "SoftwareApplication", name: "Codex", applicationCategory: "DeveloperApplication" },
        ...models.map((m) => ({ "@type": "Thing", name: m })),
      ],
      isAccessibleForFree: true,
    },
    {
      "@type": "HowTo",
      name: "在 Claude Code / Codex 中配置 AI 公益站",
      description: SETUP.lead,
      inLanguage: "zh-CN",
      step: SETUP.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: [s.body, s.note].filter(Boolean).join(" "),
      })),
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
<meta name="author" content="${esc(SITE.authorName)}">
<meta name="theme-color" content="#10b981">
<!-- 放行富摘要：允许大图预览、不限制文本摘要长度。搜索结果的问答富摘要和 AI 引用
     都受这条约束，收紧了等于自己把可见度砍掉。 -->
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="${esc(SITE.url)}">${verify.length ? "\n" + verify.join("\n") : ""}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.brand)}">
<meta property="og:locale" content="zh_CN">
<meta property="og:url" content="${esc(SITE.url)}">
<meta property="og:title" content="${esc(SITE.title)}">
<meta property="og:description" content="${esc(SITE.description)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(SITE.brand)} — ${esc(RELAYS.map((r) => r.name.replace(/\s*公益站$/, "")).join(" / "))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(SITE.title)}">
<meta name="twitter:description" content="${esc(SITE.description)}">
<meta name="twitter:image" content="${esc(img)}">
<meta name="twitter:image:alt" content="${esc(SITE.brand)}">
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
${PAGES.map((p) => `  <url>
    <loc>${SITE.url}${p.slug}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n")}
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
配置教程：${SITE.url}${GUIDE.slug}
公益站是什么（科普）：${SITE.url}${EXPLAINER.slug}
最近更新：${new Date().toISOString().slice(0, 10)}

## 收录标准与免责

${RISKS.lead}

${RISKS.items.map((r) => `- **${r.head}**：${r.body}`).join("\n")}

页面内每条注册链接都含邀请参数（返利），卡片页脚已标注。

## 怎么挑：按等效可用量排序

等效可用量 = 注册赠额 ÷ 倍率。倍率决定同一笔额度实际能跑多少 token，所以「送多少」不是唯一指标。

| 站点 | 注册赠额 | 倍率 | 等效可用量 |
| --- | --- | --- | --- |
${rankRelays()
  .map(({ r, mult, credit, eff }) => {
    const money = (n) => "$" + (Number.isInteger(n) ? n : n.toFixed(1));
    return `| ${r.name} | ${credit == null ? "—" : money(credit)} | ${
      mult == null ? "—" : mult + "x"
    } | ${eff == null ? "—" : (Number.isInteger(eff) ? "" : "≈ ") + money(eff)} |`;
  })
  .join("\n")}

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

## 配置方法

${SETUP.lead}

${SETUP.steps.map((s) => `### ${s.title}

${s.body}

\`\`\`
${s.code}
\`\`\`

${s.note}`).join("\n\n")}

### 常见坑

${SETUP.pitfalls.map((p) => `- ${p}`).join("\n")}

## 常见问题

${FAQ.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## ${OFFICIAL_FREE.title}

${OFFICIAL_FREE.lead}

${OFFICIAL_FREE.items.map((it) => `- **${it.name}**（${it.url}）：${it.note}`).join("\n")}

${OFFICIAL_FREE.source}（${OFFICIAL_FREE.sourceUrl}）
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

/* ---------- 独立教程页 guide.html ----------
   复用主页的 <style> 和首屏主题 bootstrap（都从 template.html 抽出来传进来），
   外观和暗色模式跟主页一致；不带切换按钮，跟随已保存 / 系统的主题。
   专吃「Claude Code / Codex 中转站怎么配」这类长尾词，和首页两头互链。 */
function pageHTML(page, sharedStyle, bootstrap) {
  const url = SITE.url + page.slug;
  const img = SITE.url + "og.png";
  const dMod = RELAYS.reduce((a, r) => (r.verifiedAt > a ? r.verifiedAt : a), "1970-01-01");
  const dPub = RELAYS.reduce((a, r) => (r.verifiedAt < a ? r.verifiedAt : a), "9999-12-31");

  const sections = page.sections
    .map((s) => {
      const paras = (s.body || []).map((p) => `        <p class="guide-p">${esc(p)}</p>`).join("\n");
      const code = s.code ? `        <pre class="setup-code"><code>${esc(s.code)}</code></pre>` : "";
      const list = s.list
        ? `        <ul class="pick-list">\n${s.list.map((x) => `          <li>${esc(x)}</li>`).join("\n")}\n        </ul>`
        : "";
      const after = s.after ? `        <p class="guide-p">${esc(s.after)}</p>` : "";
      return `      <section class="guide-sec">\n        <h2 class="h2">${esc(s.h)}</h2>\n${[paras, code, list, after].filter(Boolean).join("\n")}\n      </section>`;
    })
    .join("\n");

  const howToSteps = page.sections
    .filter((s) => s.code)
    .map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.h, text: [...(s.body || []), s.after].filter(Boolean).join(" ") }));

  const graph = [
    {
      "@type": page.articleType || "TechArticle",
      "@id": url,
      headline: page.title,
      description: page.description,
      inLanguage: "zh-CN",
      datePublished: dPub,
      dateModified: dMod,
      author: { "@type": "Person", name: SITE.authorName, url: SITE.author },
      publisher: { "@type": "Person", name: SITE.authorName, url: SITE.author },
      image: img,
      mainEntityOfPage: url,
      isPartOf: { "@id": SITE.url + "#website" },
    },
    ...(howToSteps.length
      ? [{ "@type": "HowTo", name: "在 Claude Code / Codex 中配置 AI 公益站", inLanguage: "zh-CN", step: howToSteps }]
      : []),
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: SITE.brand, item: SITE.url },
        { "@type": "ListItem", position: 2, name: page.breadcrumb, item: url },
      ],
    },
  ];
  const ld = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="keywords" content="${esc(page.keywords.join("，"))}">
<meta name="author" content="${esc(SITE.authorName)}">
<meta name="theme-color" content="#10b981">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(SITE.brand)}">
<meta property="og:locale" content="zh_CN">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">
${ld}
</script>
<link rel="icon" href="favicon.svg" type="image/svg+xml">
${bootstrap}
<style>${sharedStyle}</style>
</head>
<body>
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="./">
      <svg class="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#10b981"/>
        <path d="M7 15.5 12 7l5 8.5" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      ${esc(SITE.brand)}
    </a>
    <div class="topbar-right">
      <a class="nav-link" href="./">← 返回清单</a>
      <a class="nav-link" href="${esc(SITE.author)}" target="_blank" rel="noopener">GitHub</a>
    </div>
  </div>
</header>
<main>
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow">${esc(page.eyebrow)}</p>
      <h1 class="hero-title">${esc(page.title)}</h1>
      <p class="hero-lead">${esc(page.intro)} <a href="./#stations">去看清单 →</a></p>
    </div>
  </section>
  <section class="pick-band">
    <div class="wrap guide-body">
${sections}
      <p class="guide-p" style="margin-top:28px">${page.outro}</p>
    </div>
  </section>
</main>
<footer class="site-foot">
  <div class="wrap">
    <p>本页仅汇总公开信息与个人实测结果，不代表任何形式的担保或推荐承诺。源码在 <a href="${esc(SITE.repo)}" target="_blank" rel="noopener">GitHub</a>。</p>
  </div>
</footer>
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
  PICK: pickHTML(),
  SETUP: setupHTML(),
  OFFICIAL_FREE: officialFreeHTML(),
  OFFICIAL_FREE_TITLE: esc(OFFICIAL_FREE.title),
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

/* 教程页复用主页的 <style> 和首屏主题 bootstrap，从 template.html 里抽出来，
   保证外观和暗色模式与主页一致，CSS 只维护一份。 */
const styleMatch = tpl.match(/<style>([\s\S]*?)<\/style>/);
const bootMatch = tpl.match(/<script>[\s\S]*?<\/script>/);
if (!styleMatch || !bootMatch) {
  console.error("从 template.html 抽 <style> / 首屏 bootstrap 失败，子页面没生成");
  process.exit(1);
}
for (const page of PAGES) {
  writeFileSync(page.slug, pageHTML(page, styleMatch[1], bootMatch[0]));
}

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
console.log(`子页面        ${PAGES.map((p) => p.slug).join(" · ")}`);
console.log(`sitemap.xml   ${PAGES.length + 1} 条 URL`);
console.log(`robots.txt    放行全部抓取器`);
console.log(`llms.txt      ${llmsTxt().length} 字`);
console.log(`og.html       预览图源（截图命令见 README）`);
console.log(`README.md     清单表格已同步`);
console.log(`\n不执行 JS 时的可索引正文：${text.length} 字`);
