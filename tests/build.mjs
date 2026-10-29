import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { RELAYS, SETUP, GUIDE, EXPLAINER, FAQ, SITE } from "../data.js";

const root = fileURLToPath(new URL("../", import.meta.url));
execFileSync(process.execPath, ["build.mjs"], { cwd: root, stdio: "inherit" });
const read = name => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const esc = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const html = read("index.html");
const htmlEn = read("index-en.html");
const graph = source => JSON.parse(source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
for (const name of ["index.html", GUIDE.slug, EXPLAINER.slug]) {
  const source = read(name);
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(source), `${name}: unresolved placeholder`);
  assert.equal((source.match(/<h1\b/g) || []).length, 1, `${name}: one h1`);
  assert.ok(source.includes('<html lang="zh-CN">'));
  assert.ok(source.includes('<link rel="canonical"'));
  assert.ok(graph(source).length > 0);
}
assert.ok(htmlEn.includes('<html lang="en">'));
assert.ok(htmlEn.includes(`<link rel="canonical" href="${SITE.url}index-en.html">`), "English page has its own canonical");
for (const lang of ["zh-CN", "en", "x-default"]) assert.ok(html.includes(`hreflang="${lang}"`), `hreflang ${lang}`);
assert.ok(read("index-zh.html").includes('http-equiv="refresh"'), "old zh URL redirects to root");

// 首屏主按钮直达第一个可用站，且带统计属性
const live = RELAYS.filter(relay => !relay.unavailable);
const hero = html.match(/<a class="btn-hero"[^>]*>/)?.[0] ?? "";
assert.ok(hero.includes(`href="${esc(live[0].aff)}"`), "hero button points at first live relay");
assert.ok(hero.includes('data-umami-event="register"'));
// 第一个站对账号有门槛时，必须给出新账号可用的备选
if (!live[0].newAccountOk) {
  const alt = live.find(relay => relay.newAccountOk);
  assert.ok(alt, "need a new-account-friendly alternative");
  assert.ok(/<p class="hero-alt">[\s\S]*?<\/p>/.exec(html)[0].includes(esc(alt.aff)));
}
// 不可用的站收进折叠的历史记录，不占清单主体
const mainList = html.match(/<ol class="pick-rows">([\s\S]*?)<\/ol>/)[1];
for (const relay of RELAYS.filter(relay => relay.unavailable)) assert.ok(!mainList.includes(esc(relay.host)), `${relay.id} not in main pick list`);
assert.ok(html.includes('class="pick-history"'));
// 倍率解释已删除
for (const gone of ["倍率是什么", "等效额度", "等效可用量"]) for (const [name, source] of [["index", html], ["llms", read("llms.txt")]]) assert.ok(!source.includes(gone), `${name}: ${gone}`);
assert.ok(!FAQ.some(item => item.q.includes("倍率")));
// 统计 id 配了之后脚本必须出现
if (SITE.umamiId) assert.ok(html.includes(`data-website-id="${esc(SITE.umamiId)}"`));
const sitemap = read("sitemap.xml");
assert.deepEqual(graph(html).map(node => node["@type"]), ["WebSite", "Person", "WebPage", "HowTo", "ItemList", "FAQPage"]);
assert.equal(graph(html).find(node => node["@type"] === "FAQPage").mainEntity.length, FAQ.length);
assert.ok(!html.includes("<dialog"), "No forced risk popup");
assert.ok(!html.includes('class="risk-strip"'), "No defensive strip on first screen");
assert.ok(html.includes(esc(SITE.googleVerification)), "Retain site verification");
for (const hedge of ["待核对", "未确认", "曾通过", "请向站点确认"]) assert.ok(!html.includes(hedge), `No hedge wording: ${hedge}`);
assert.ok(!html.includes("可以确认不存在掺水"));
for (const relay of RELAYS) {
  assert.ok(html.includes(`id="relay-${esc(relay.id)}"`));
  assert.equal(html.includes(`href="${esc(relay.aff)}"`), !relay.unavailable, `${relay.id}: preserve full invitation URL`);
  for (const text of [relay.name, relay.tested, relay.tools, relay.eligibility, ...(relay.unavailable ? [] : [relay.signup]), ...(relay.notes || []), ...(relay.tips || [])]) {
    assert.ok(html.includes(esc(text)), `${relay.id}: static content missing: ${text}`);
  }
  for (const model of relay.models) {
    assert.ok(html.includes(`<option value="${esc(model)}">`));
  }
  assert.ok(html.includes(`datetime="${relay.verifiedAt}"`));
}
for (const step of SETUP.steps) assert.ok(html.includes(esc(step.code)), "Preserve API setup code verbatim");
for (const section of GUIDE.sections.filter(section => section.code)) assert.ok(read(GUIDE.slug).includes(esc(section.code)));
assert.equal((sitemap.match(/<loc>/g) || []).length, 4);
assert.ok(sitemap.includes("hreflang"), "sitemap carries hreflang alternates");
assert.ok(read("robots.txt").includes("Allow: /"));
console.log("PASS: static content, invitation URLs, model options, API code, all schemas, verification and sitemap.");
