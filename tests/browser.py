"""Optional browser regression checks. Requires Python Playwright + Chromium.
Run `python -m http.server 8767` in this repo, then `python tests/browser.py`.
Screenshots are written to the ignored .claude/screenshots directory.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
URL = os.environ.get("AI_RELAY_URL", "http://127.0.0.1:8767").rstrip("/")
SHOTS = BASE / ".claude" / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.goto(URL, wait_until="networkidle")
    page.screenshot(path=str(SHOTS / "desktop.png"), full_page=True)
    assert page.locator(".card:visible").count() == 4
    # Landing view: every station, its credit and a sign-up link sit in the first screen.
    assert page.locator(".pick-row").count() == 4
    last_cta = page.locator(".pick-row .pick-cta").last.bounding_box()
    assert last_cta["y"] + last_cta["height"] <= 900, last_cta
    assert page.locator("dialog").count() == 0
    assert page.locator("html.dark").count() == 0
    page.locator("#search").fill("GitHub")
    assert page.locator(".card:visible").count() == 3
    page.locator("#model-filter").select_option("gpt-5.6")
    assert page.locator(".card:visible").count() == 1
    page.locator("#search").fill("not-a-station")
    assert page.locator("#empty-state").is_visible()
    page.locator("#clear-filters").click()
    page.wait_for_timeout(30)
    assert page.locator(".card:visible").count() == 4
    assert page.locator("#search").evaluate("el => el === document.activeElement")
    page.locator("#search").fill("nomatch")
    page.locator('.pick a[href="#relay-kktoken"]').click()
    page.wait_for_timeout(30)
    assert page.locator("#relay-kktoken").is_visible()
    assert page.locator(".card:visible").count() == 4
    page.locator("#relay-kktoken .card-details summary").focus()
    page.keyboard.press("Enter")
    assert page.locator("#relay-kktoken .card-details").get_attribute("open") is not None
    page.locator(".faq-item summary").first.focus()
    page.keyboard.press("Enter")
    assert page.locator(".faq-item").first.get_attribute("open") is not None
    page.locator("#theme-toggle").click()
    assert page.locator("html.dark").count() == 1
    assert page.locator("#theme-toggle").get_attribute("aria-label") == "切换浅色模式"
    page.reload()
    assert page.locator("html.dark").count() == 1
    page.screenshot(path=str(SHOTS / "dark.png"), full_page=True)
    page.locator("#theme-toggle").click()
    for width in [320, 375, 768, 1440]:
        page.set_viewport_size({"width": width, "height": 900})
        page.goto(URL, wait_until="networkidle")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"overflow {width}"
        assert page.locator("#relay-tabitoken .restrictions").is_visible()
        if width == 375:
            page.screenshot(path=str(SHOTS / "mobile.png"), full_page=True)
        for subpage in ["guide.html", "what-is-ai-relay.html"]:
            page.goto(URL + "/" + subpage, wait_until="networkidle")
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"overflow {subpage} {width}"
            assert page.locator("h1").count() == 1
    nojs = browser.new_context(java_script_enabled=False, viewport={"width": 375, "height": 900})
    static = nojs.new_page()
    static.goto(URL)
    assert static.locator(".card:visible").count() == 4
    assert static.locator("#filters").is_hidden()
    assert static.locator("#risk .rd-list").is_visible()
    assert static.locator("#relay-kktoken .restrictions").is_visible()
    aged = browser.new_context()
    aged.add_init_script('Date.now = () => new Date("2027-02-01T00:00:00Z").getTime()')
    stale = aged.new_page()
    stale.goto(URL)
    assert stale.locator(".stale").count() == 4
    page.set_viewport_size({"width": 1200, "height": 630})
    page.goto(URL + "/og.html", wait_until="networkidle")
    page.screenshot(path=str(SHOTS / "og.png"))
    assert not errors, errors
    browser.close()
print("PASS: filtering/reset, anchor recovery, keyboard details, theme persistence, no-JS, stale dates, responsive pages, zero JS errors.")
print("Screenshots:", SHOTS)
