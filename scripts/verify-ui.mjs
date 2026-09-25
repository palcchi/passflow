import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch();
await mkdir("verification", { recursive: true });
const routes = ["/", "/admin", "/e/discoveries-2026", "/e/night-shift-sessions", "/e/discoveries-2026/claim", "/admin/events/evt_discoveries_2026/appearance", "/scan/main-entrance"];
try {
  for (const width of [320, 375, 430, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of routes) {
      const response = await page.goto(`http://127.0.0.1:3000${route}`);
      assert.equal(response.status(), 200, `${width}px ${route} status`);
      await page.locator("h1").waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `${width}px ${route} horizontal overflow`);
      if (route === "/admin") assert.equal(await page.locator(".stat-card strong").nth(1).innerText(), "688");
      await page.screenshot({ path: `verification/${width}-${route.replaceAll("/", "_") || "home"}.png`, fullPage: true });
      console.log(`PASS ${width}px ${route}`);
    }
    assert.deepEqual(errors, [], `${width}px browser errors`);
    await page.close();
  }
} finally {
  await browser.close();
}
