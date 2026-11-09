import assert from "node:assert/strict";
import { test } from "node:test";
import { createSubmission, waitForDeployment, notifyIndexNow } from "../scripts/indexnow.mjs";

const site = { url: "https://example.com/ai-relay/", indexNowKey: "12345678" };
const sitemap = `<urlset><url><loc>${site.url}</loc></url><url><loc>${site.url}compare.html</loc></url></urlset>`;
const payload = createSubmission(site, sitemap);
const files = { "sitemap.xml": sitemap, "index.html": "new home\r\n", "compare.html": "new comparison\r\n" };
const deployed = new Map([[payload.keyLocation, payload.key + "\n"], [site.url + "sitemap.xml", sitemap], [site.url, "new home\n"], [site.url + "compare.html", "new comparison\n"]]);
const options = { siteUrl: site.url, read: (name) => files[name], attempts: 2, interval: 0, log: () => {} };

test("payload includes new sitemap pages and respects project key scope", () => {
  assert.deepEqual(payload.urlList, [site.url, site.url + "compare.html"]);
  assert.equal(payload.keyLocation, site.url + site.indexNowKey + ".txt");
  for (const url of ["https://example.com/other/", "https://example.net/ai-relay/", site.url + "../other/", site.url + "?filter=1"]) {
    assert.throws(() => createSubmission(site, `<loc>${url}</loc>`), /outside/);
  }
  assert.throws(() => createSubmission(site, ""), /unique URLs/);
  assert.throws(() => createSubmission(site, sitemap + sitemap), /unique URLs/);
});

test("waits for new HTML, sitemap and key before allowing notification", async () => {
  let published = false;
  let waits = 0;
  await waitForDeployment(payload, {
    ...options,
    request: async (url) => new Response(published ? deployed.get(url) : "old content"),
    wait: async () => { published = true; waits++; },
  });
  assert.equal(waits, 1);
});

test("a wrong key, old page, HTTP error or network failure blocks notification", async () => {
  for (const failingUrl of deployed.keys()) {
    await assert.rejects(waitForDeployment(payload, {
      ...options, attempts: 1,
      request: async (url) => new Response(url === failingUrl ? "old revision or wrong key" : deployed.get(url)),
    }), /not published/);
  }
  await assert.rejects(waitForDeployment(payload, { ...options, attempts: 1, request: async () => new Response("unavailable", { status: 503 }) }), /not published/);
  await assert.rejects(waitForDeployment(payload, { ...options, attempts: 1, request: async () => { throw new Error("offline"); } }), /not published/);
});

test("only IndexNow 200 or 202 counts as accepted; rejection fails the job", async () => {
  for (const status of [200, 202]) {
    assert.equal(await notifyIndexNow(payload, async (url, options) => {
      assert.equal(url, "https://api.indexnow.org/IndexNow");
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), payload);
      return new Response("", { status });
    }), status);
  }
  for (const status of [400, 403, 422, 429, 500]) {
    await assert.rejects(notifyIndexNow(payload, async () => new Response("rejected", { status })), new RegExp(`HTTP ${status}`));
  }
});
