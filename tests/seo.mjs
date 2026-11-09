import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { SITE, RELAYS, COMPARISON } from "../data.js";

const read = (name) => readFileSync(new URL("../" + name, import.meta.url), "utf8");
const sitemap = read("sitemap.xml");
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => ({
  url: match[1].match(/<loc>(.*?)<\/loc>/)[1],
  modified: match[1].match(/<lastmod>(.*?)<\/lastmod>/)[1],
}));
const fileFor = (url) => new URL(url).pathname.slice(new URL(SITE.url).pathname.length) || "index.html";
const pages = entries.map((entry) => ({ ...entry, html: read(fileFor(entry.url)) }));
const schema = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

test("every sitemap page has a unique title, correct canonical and matching dates", () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const { url, html, modified } of pages) {
    assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`));
    assert.ok(!/noindex/.test(html), `${url}: indexable`);
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    const description = html.match(/<meta name="description" content="(.*?)"/)[1];
    assert.ok(title && !titles.has(title), `${url}: unique title`);
    assert.ok(description && !descriptions.has(description), `${url}: unique description`);
    titles.add(title);
    descriptions.add(description);
    const graph = schema(html);
    assert.equal(graph.find((node) => node["@type"] === "WebPage").url, url);
    const dated = graph.find((node) => node.dateModified);
    assert.equal(dated.dateModified, modified);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
    assert.ok(dated.datePublished <= modified && modified <= today, `${url}: dates follow the site's Asia/Shanghai calendar`);
  }
});

test("all internal links and fragment targets resolve without JavaScript", () => {
  for (const { url, html } of pages) {
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${url}: unique IDs`);
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      const target = new URL(href.replaceAll("&amp;", "&"), url);
      if (!target.href.startsWith(SITE.url)) continue;
      const file = fileFor(target);
      assert.ok(existsSync(new URL("../" + file, import.meta.url)), `${url} links to missing ${file}`);
      if (target.hash) assert.ok(read(file).includes(`id="${decodeURIComponent(target.hash.slice(1))}"`), `${url}: broken ${href}`);
    }
  }
});

test("language variants self-canonicalize and reference each other", () => {
  for (const name of ["index.html", "index-en.html"]) {
    const html = read(name);
    for (const [lang, href] of [["zh-CN", SITE.url], ["en", SITE.url + "index-en.html"], ["x-default", SITE.url]]) {
      assert.ok(html.includes(`hreflang="${lang}" href="${href}"`));
    }
  }
  const english = read("index-en.html");
  assert.ok(!/[\u4e00-\u9fff]/.test(english.match(/<title>(.*?)<\/title>/)[1]));
  const graph = schema(english);
  assert.equal(graph.find((node) => node["@type"] === "WebPage")["@id"], SITE.url + "index-en.html");
  assert.equal(graph.find((node) => node["@type"] === "WebPage").inLanguage, "en");
  assert.ok(!entries.some((entry) => /index-zh|template|og\.html/.test(entry.url)));
});

test("search and machine summaries do not recommend unavailable relays", () => {
  const live = RELAYS.filter((relay) => !relay.unavailable);
  for (const name of ["index.html", "index-en.html"]) {
    const list = schema(read(name)).find((node) => node["@type"] === "ItemList");
    assert.equal(list.numberOfItems, live.length);
    assert.deepEqual(list.itemListElement.map((item) => new URL(item.url).hash), live.map((r) => "#relay-" + r.id));
  }
  for (const relay of RELAYS.filter((r) => r.unavailable)) {
    const summary = read("llms.txt").split(`### ${relay.name}\n`)[1].split("\n###")[0];
    assert.ok(summary.includes("状态：不可用"));
    assert.ok(!read("README.md").includes(`](${relay.aff})`));
  }
});

test("comparison data and article navigation are visible and current", () => {
  const html = read(COMPARISON.slug);
  for (const id of COMPARISON.sections[0].compareRelays) {
    const relay = RELAYS.find((r) => r.id === id);
    for (const text of [relay.eligibility, relay.tools, relay.signup, relay.verifiedAt, relay.tested]) assert.ok(html.includes(esc(text)));
  }
  for (const { html, url } of pages.filter((p) => !/index|\/$/.test(p.url))) {
    for (const label of ["面包屑", "本文目录", "相关阅读"]) assert.ok(html.includes(`aria-label="${label}"`), `${url}: ${label}`);
  }
  const article = schema(html).find((node) => node["@type"] === "Article");
  assert.equal(article.datePublished, COMPARISON.published);
  assert.ok(read("_config.yml").includes("- template.html"), "exclude source template from Pages");
});
