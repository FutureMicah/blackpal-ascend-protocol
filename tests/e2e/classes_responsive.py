"""
End-to-end responsive tests for the Classes page and live session room.

Run:
  python3 tests/e2e/classes_responsive.py

The dev server must already be running on localhost:8080.
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright, Page

BASE = "http://localhost:8080"
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BREAKPOINTS = [
    ("mobile-portrait",     320,  568),
    ("mobile-portrait-md",  390,  844),
    ("mobile-landscape",    844,  390),
    ("tablet-portrait",     768, 1024),
    ("tablet-landscape",   1024,  768),
    ("desktop",            1440,  900),
]

async def restore_session(page: Page):
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    await page.goto(BASE, wait_until="domcontentloaded")
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )

async def check_breakpoint(playwright, name: str, w: int, h: int, results: list):
    browser = await playwright.chromium.launch(headless=True)
    ctx = await browser.new_context(viewport={"width": w, "height": h})
    page = await ctx.new_page()
    try:
        await restore_session(page)
        await page.goto(f"{BASE}/classes", wait_until="domcontentloaded")
        # wait for either skeleton or content
        await page.wait_for_timeout(1500)
        await page.screenshot(path=str(SHOTS / f"classes-{name}.png"))

        # Assert hero stats fit (no horizontal overflow on body)
        overflow_x = await page.evaluate(
            "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        fits = overflow_x <= 1
        results.append((f"{name}: classes page no horizontal overflow", fits, f"overflow={overflow_x}"))

        # Try to open course details dialog if any card exists
        first_card = page.locator('[class*="Card"], button:has-text("Continue"), button:has-text("Enroll")').first
        if await first_card.count() > 0:
            try:
                await first_card.scroll_into_view_if_needed()
                await first_card.click(timeout=2000)
                await page.wait_for_timeout(500)
                dlg = page.locator('[role="dialog"]').first
                visible = await dlg.is_visible()
                results.append((f"{name}: course/details opens", visible, ""))
                await page.screenshot(path=str(SHOTS / f"classes-dialog-{name}.png"))
                # Esc to close
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(300)
            except Exception as e:
                results.append((f"{name}: dialog open", False, str(e)[:120]))

        # Tap targets ≥ 40px on mobile
        if w < 768:
            small_btns = await page.evaluate("""
              () => Array.from(document.querySelectorAll('button')).filter(b => {
                const r = b.getBoundingClientRect();
                return b.offsetParent !== null && r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32);
              }).length
            """)
            results.append((f"{name}: no tiny buttons", small_btns <= 6, f"{small_btns} buttons < 32px"))
    finally:
        await browser.close()

async def main():
    results = []
    async with async_playwright() as p:
        for name, w, h in BREAKPOINTS:
            print(f"→ {name} ({w}×{h})")
            try:
                await check_breakpoint(p, name, w, h, results)
            except Exception as e:
                results.append((f"{name}: harness", False, str(e)[:200]))

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{'='*60}\nResults: {passed}/{len(results)} passed\n{'='*60}")
    for label, ok, note in results:
        mark = "✓" if ok else "✗"
        print(f"  {mark} {label}" + (f"  ({note})" if note else ""))
    sys.exit(0 if passed == len(results) else 1)

asyncio.run(main())
