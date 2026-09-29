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
const graph = source => JSON.parse(source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
for (const name of ["index.html", GUIDE.slug, EXPLAINER.slug]) {
  const source = read(name);
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(source), `${name}: unresolved placeholder`);
  assert.equal((source.match(/<h1\b/g) || []).length, 1, `${name}: one h1`);
  assert.ok(source.includes('<html lang="zh-CN">'));
  assert.ok(source.includes('<link rel="canonical"'));
  assert.ok(graph(source).length > 0);
}
assert.deepEqual(graph(html).map(node => node["@type"]), ["WebSite", "Person", "WebPage", "HowTo", "ItemList", "FAQPage"]);
assert.equal(graph(html).find(node => node["@type"] === "FAQPage").mainEntity.length, FAQ.length);
assert.ok(!html.includes("<dialog"), "No forced risk popup");
assert.ok(html.includes(esc(SITE.googleVerification)), "Retain site verification");
assert.ok(html.includes("基准价格") && read("llms.txt").includes("基准价格"));
assert.ok(!html.includes("可以确认不存在掺水"));
for (const relay of RELAYS) {
  assert.ok(html.includes(`id="relay-${esc(relay.id)}"`));
  assert.ok(html.includes(`href="${esc(relay.aff)}"`), `${relay.id}: preserve full invitation URL`);
  for (const text of [relay.name, relay.tested, relay.tools, relay.eligibility, relay.signup, ...(relay.notes || []), ...(relay.tips || [])]) {
    assert.ok(html.includes(esc(text)), `${relay.id}: static content missing: ${text}`);
  }
  for (const model of relay.models) {
    assert.ok(html.includes(`<option value="${esc(model)}">`));
  }
  assert.ok(html.includes(`datetime="${relay.verifiedAt}"`));
}
for (const step of SETUP.steps) assert.ok(html.includes(esc(step.code)), "Preserve API setup code verbatim");
for (const section of GUIDE.sections.filter(section => section.code)) assert.ok(read(GUIDE.slug).includes(esc(section.code)));
assert.equal((read("sitemap.xml").match(/<loc>/g) || []).length, 3);
assert.ok(read("robots.txt").includes("Allow: /"));
console.log("PASS: static content, invitation URLs, model options, API code, all schemas, verification and sitemap.");
