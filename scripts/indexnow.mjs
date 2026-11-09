import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { SITE } from "../data.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const normalize = (text) => text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").trim();

export function createSubmission(site, sitemap) {
  const base = new URL(site.url);
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(site.indexNowKey)) throw new Error("Invalid IndexNow key");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (!urls.length || urls.length > 10000 || new Set(urls).size !== urls.length) {
    throw new Error("Sitemap must contain 1–10000 unique URLs");
  }
  for (const url of urls) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.origin !== base.origin || !parsed.pathname.startsWith(base.pathname) || parsed.search || parsed.hash) {
      throw new Error(`URL outside the verified project path: ${url}`);
    }
  }
  return { host: base.host, key: site.indexNowKey, keyLocation: `${base}${site.indexNowKey}.txt`, urlList: urls };
}

export async function waitForDeployment(payload, {
  siteUrl = SITE.url,
  read = (name) => readFileSync(resolve(root, name), "utf8"),
  request = fetch,
  wait = delay,
  attempts = 24,
  interval = 15000,
  log = console.log,
} = {}) {
  const base = new URL(siteUrl);
  const expected = [
    [payload.keyLocation, payload.key],
    [`${base}sitemap.xml`, read("sitemap.xml")],
    ...payload.urlList.map((url) => {
      const path = new URL(url).pathname.slice(base.pathname.length) || "index.html";
      if (!/^[\w-]+\.html$/.test(path)) throw new Error(`Unsupported page path: ${path}`);
      return [url, read(path)];
    }),
  ];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const pending = (await Promise.all(expected.map(async ([url, content]) => {
      try {
        const response = await request(url, { signal: AbortSignal.timeout(15000), headers: { "Cache-Control": "no-cache" } });
        return response.status === 200 && normalize(await response.text()) === normalize(content) ? null : url;
      } catch { return url; }
    }))).filter(Boolean);
    if (!pending.length) {
      log(`Verified deployed sitemap, key and ${payload.urlList.length} pages.`);
      return;
    }
    log(`Waiting for GitHub Pages (${attempt}/${attempts}): ${pending.join(", ")}`);
    if (attempt < attempts) await wait(interval);
  }
  throw new Error("Pages has not published this revision; IndexNow was not notified. Re-run after deployment.");
}

export async function notifyIndexNow(payload, request = fetch) {
  const response = await request("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow rejected the submission (HTTP ${response.status}): ${(await response.text()).slice(0, 500)}`);
  }
  return response.status;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (!SITE.indexNowKey) {
      console.log("IndexNow skipped: no key configured.");
    } else {
      const payload = createSubmission(SITE, readFileSync(resolve(root, "sitemap.xml"), "utf8"));
      await waitForDeployment(payload);
      const status = await notifyIndexNow(payload);
      console.log(`IndexNow accepted ${payload.urlList.length} URLs (HTTP ${status}). Acceptance does not confirm indexing.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
