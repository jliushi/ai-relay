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

const fmtDate = (iso) =>
  iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$1 年 $2 月 $3 日");
const latestDate = RELAYS.reduce((latest, r) => r.verifiedAt > latest ? r.verifiedAt : latest, "1970-01-01");
const isPaid = (aff) => /[?&]aff=/.test(aff);
const money = (n) => "$" + (Number.isInteger(n) ? n : n.toFixed(1));
const shortName = (r) => r.name.replace(/\s*公益站$/, "");
const BRAND_MARK = `<svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#20344a"/><path d="M8 11h10M8 16h7M8 21h5" stroke="#fffefa" stroke-width="2" stroke-linecap="round"/><path d="m20 12-4 10h5l4-10z" fill="#ed9c72"/></svg>`;

/* 赠额与倍率只解析原始文案，不能解析时不猜数字。折算值不是实际 token 数。 */
function relayCredit(r) {
  const num = (s, re) => {
    const match = String(s).match(re);
    const value = match ? Number(match[1].replace(/,/g, "")) : NaN;
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const mult = num(r.rate, /([\d.]+)\s*x/i);
  const credit = num(r.signup, /\$\s*([\d,.]+)/);
  return { r, mult, credit, eff: mult > 0 && credit !== null ? credit / mult : null };
}
const rankRelays = () => RELAYS.map(relayCredit).sort((a, b) => (b.eff ?? -1) - (a.eff ?? -1));
/* H1 第二行跟着数据走：站点增减、赠额变化都不用改文案。 */
function heroSub() {
  const credits = RELAYS.map((r) => relayCredit(r).credit).filter((c) => c !== null);
  const lo = Math.min(...credits), hi = Math.max(...credits);
  const range = !credits.length ? "" : lo === hi ? `，注册送 ${money(hi)}` : `，注册送 ${money(lo)}–${money(hi)}`;
  return `${RELAYS.length} 个实测公益站${range}`;
}

/* 重要须知常驻，不再使用悬停覆盖层。邀请奖励和实测原文保留在原生 details 中。 */
function cardHTML(r, i) {
  const paid = isPaid(r.aff);
  const { credit } = relayCredit(r);
  const notes = r.notes?.length ? `<div class="restrictions"><p class="block-head">使用条件与限制</p><ul class="list">${r.notes.map(note => `<li>${esc(note)}</li>`).join("")}</ul></div>` : "";
  const tips = r.tips?.length ? `<ul class="list">${r.tips.map(tip => `<li>${esc(tip)}</li>`).join("")}</ul>` : "";
  return `        <li class="card" id="relay-${esc(r.id)}" data-verified="${esc(r.verifiedAt)}" data-models="${esc(JSON.stringify(r.models))}">
          <div class="card-main">
            <header class="card-head"><div><h3 class="name">${esc(r.name)}</h3><p class="host">${esc(r.host)}</p></div><span class="card-index" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span></header>
            <ul class="models" aria-label="记录中的模型">${r.models.map(model => `<li class="model">${esc(model)}</li>`).join("")}</ul>
            <div class="credit-line"><span class="credit-value">${credit === null ? "未记录" : esc(money(credit))}</span><span class="credit-label">注册赠额</span><span class="rate">${esc(r.rate)}</span></div>
            <p class="signup-note">${esc(r.signup)}</p>
            <dl class="card-facts"><div><dt>工具接入</dt><dd>${esc(r.tools)}</dd></div><div><dt>注册观察</dt><dd>${esc(r.eligibility)}</dd></div></dl>
${notes}
${tips}
            <details class="card-details"><summary>邀请规则与实测记录</summary><p>${r.invite ? esc(r.invite) : "未记录邀请奖励，请向站点确认。"}</p><p class="tested">实测记录：${esc(r.tested)}</p></details>
          </div>
          <footer class="foot"><div class="card-footer-row"><p class="meta">实测于 <time datetime="${esc(r.verifiedAt)}">${esc(r.verifiedAt)}</time><br>${paid ? "邀请链接 · 注册可能给邀请人带来额度" : "不含邀请参数"}</p><a class="cta" href="${esc(r.aff)}" target="_blank" rel="${paid ? "noopener nofollow sponsored" : "noopener nofollow"}" aria-label="${esc(r.name)}：${paid ? "通过邀请链接注册" : "前往注册"}（新窗口）">注册 ${esc(shortName(r))} <span aria-hidden="true">↗</span></a></div></footer>
        </li>`;
}

/* 首屏清单：落地第一眼就能看到有哪些站、送多少、点哪里注册。按折算额度排序，
   折算的前提写在清单底部；注册条件和「仅 Claude Code」这类硬限制跟着每一行走。 */
const claudeOnly = (r) => /不支持\s*Codex|只支持\s*Claude Code/.test([r.tools, ...(r.notes || [])].join(" "));
const needsProxy = (r) => (r.notes || []).some((note) => note.includes("科学上网"));

function pickHTML() {
  const rows = rankRelays().map(({ r, mult, credit, eff }, i) => {
    const paid = isPaid(r.aff);
    const tags = [
      ...r.models.map((m) => `<li class="tag">${esc(m)}</li>`),
      claudeOnly(r) ? `<li class="tag tag-warn">仅 Claude Code</li>` : "",
      needsProxy(r) ? `<li class="tag tag-warn">需科学上网</li>` : "",
    ].join("");
    const rate = mult === null ? "倍率未记录" : `${mult}x 倍率`;
    const effLine = eff === null || eff === credit ? "" : `<span class="pick-eff">等效 ≈ ${esc(money(eff))}</span>`;
    return `          <li class="pick-row">
            <span class="pick-rank" aria-hidden="true">${i + 1}</span>
            <div class="pick-info">
              <h3 class="pick-name"><a href="#relay-${esc(r.id)}">${esc(shortName(r))}</a><span class="pick-host">${esc(r.host)}</span></h3>
              <ul class="pick-tags" aria-label="模型与限制">${tags}</ul>
              <p class="pick-cond">${esc(r.eligibility)}</p>
            </div>
            <p class="pick-credit"><strong class="numeric">${credit === null ? "—" : esc(money(credit))}</strong><span>注册送 · ${esc(rate)}</span>${effLine}${/邀请/.test(r.signup) ? `<span>需走邀请链接</span>` : ""}</p>
            <a class="pick-cta" href="${esc(r.aff)}" target="_blank" rel="${paid ? "noopener nofollow sponsored" : "noopener nofollow"}" aria-label="${esc(r.name)}：${paid ? "通过邀请链接注册" : "前往注册"}（新窗口）">注册 <span aria-hidden="true">↗</span></a>
          </li>`;
  }).join("\n");
  return `        <div class="pick-head"><h2 class="pick-title" id="pick-title">${RELAYS.length} 个实测站点</h2><span class="pick-sort">按等效额度排序</span></div>
        <ol class="pick-rows">
${rows}
        </ol>
        <p class="pick-foot">等效额度 = 注册赠额 ÷ 倍率，只在各站计费基准一致时可比，不是实际 token 数。${RELAYS.some((r) => isPaid(r.aff)) ? "注册链接含邀请参数。" : ""}<a href="#stations">看每个站的详细条件 ↓</a></p>`;
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
        description: [r.tools, r.eligibility, r.rate, r.signup, `覆盖模型：${r.models.join("、")}`].join("；"),
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
<meta name="theme-color" content="#f7f5ef">
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

等效可用量 = 注册赠额 ÷ 倍率。仅在模型、基准价格与计费口径可比时作额度参考，不是实际 token 数、可提现金额或耐用程度保证。工具接口与注册条件应优先核对。

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
- 工具接入：${r.tools}
- 注册观察：${r.eligibility}
- 倍率：${r.rate}
- 注册即得：${r.signup}${r.invite ? `\n- 邀请奖励：${r.invite}` : ""}
- 记录中的模型：${r.models.join("、")}
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
    background: #f7f5ef; color: #20344a; border: 20px solid #20344a;
  }
  .og { margin: auto; padding: 0 82px; width: 100%; }
  .eyebrow {
    font-size: 21px; font-weight: 600; letter-spacing: .13em;
    text-transform: uppercase; color: #a83d20;
  }
  h1 {
    margin: 22px 0 0; font-size: 66px; line-height: 1.1; font-weight: 800;
    letter-spacing: -.03em;
    color: #20344a;
  }
  .lead { margin-top: 18px; font-size: 42px; line-height: 1.35; font-weight: 800; color: #a83d20; }
  .row { margin-top: 46px; display: flex; gap: 12px; flex-wrap: wrap; }
  .chip {
    padding: 9px 20px; border: 1px solid #d8dbd7; border-radius: 999px;
    font-size: 22px; color: #20344a; background: #fffefa;
  }
  .foot {
    margin-top: 52px; display: flex; justify-content: space-between;
    font-size: 22px; color: #5c6670;
  }
</style>
</head>
<body>
  <div class="og">
    <p class="eyebrow">${esc(SITE.brand)} · 实测清单</p>
    <h1>${esc(SITE.heroTitle)}</h1>
    <p class="lead">${esc(heroSub())}</p>
    <div class="row">${rankRelays().map(({ r, credit }) => `<span class="chip">${esc(shortName(r))}${credit === null ? "" : ` · ${esc(money(credit))}`}</span>`).join("")}</div>
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
<meta name="theme-color" content="#f7f5ef">
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
<a class="skip" href="#main">跳到主要内容</a>
<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="./">
      ${BRAND_MARK}
      ${esc(SITE.brand)}
    </a>
    <div class="topbar-right">
      <a class="nav-link" href="./">← 返回清单</a>
      <a class="nav-link desktop-nav" href="${esc(SITE.author)}" target="_blank" rel="noopener">GitHub</a>
    </div>
  </div>
</header>
<main id="main">
  <section class="hero">
    <div class="wrap guide-body">
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
  EYEBROW: esc(`实测更新于 ${latestDate} · 非实时监控`),
  // 最后一个词不拆行：宽屏断成「Claude Code / Codex」「免费额度」，而不是从中间劈开。
  HERO_TITLE: esc(SITE.heroTitle).replace(/ (\S+)$/, ' <span class="nw">$1</span>'),
  HERO_SUB: esc(heroSub()).replace(/(\$[\d.]+–\$[\d.]+)/, '<span class="nw">$1</span>'),
  HERO_LEAD: esc(SITE.heroLead),
  CONTACT: esc(SITE.contactText),
  COUNT: String(RELAYS.length),
  LATEST_DATE: esc(latestDate),
  MODEL_OPTIONS: [...new Set(RELAYS.flatMap(r => r.models))].map(model => `<option value="${esc(model)}">${esc(model)}</option>`).join(""),
  AFF_DISCLOSURE: RELAYS.some(r => isPaid(r.aff)) ? "部分注册链接含邀请参数，注册可能给邀请人带来额度；已在相应卡片标注。" : "注册链接不含邀请参数。",
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
