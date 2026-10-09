import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch();
await mkdir("verification", { recursive: true });
const routes = ["/", "/login", "/register", "/account", "/profile", "/events", "/unauthorized", "/privacy", "/terms", "/organizer/events", "/e/adorne-nails-exhibition", "/e/adorne-nails-workshop", "/e/adorne-nails-exhibition/claim", "/organizer/events/evt_adorne_exhibition", "/organizer/events/evt_adorne_exhibition/people", "/organizer/events/evt_adorne_exhibition/access", "/organizer/events/evt_adorne_exhibition/experience", "/organizer/events/evt_adorne_exhibition/settings", "/organizer/events/evt_adorne_exhibition/design", "/scan/main-entrance"];
const failures = [];
try {
  for (const width of [320, 375, 430, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    let currentRoute = "";
    page.on("pageerror", (error) => errors.push({ route: currentRoute, message: error.message }));
    for (const route of routes) {
      currentRoute = route;
      const response = await page.goto(`http://127.0.0.1:3000${route}`);
      assert.equal(response.status(), 200, `${width}px ${route} status`);
      await page.locator("main").waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (overflow) console.log(await page.evaluate(() => [...document.querySelectorAll("main *")].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).map((el) => ({ tag: el.tagName, className: String(el.className), right: el.getBoundingClientRect().right })).slice(0, 15)));
      if (route === "/organizer/events" || route === "/account" || route === "/profile" || route === "/events" || route.includes("/claim") || route.startsWith("/organizer/events/") || route.includes("/design") || route.startsWith("/scan/")) {
        assert.equal(new URL(page.url()).pathname, "/login", `Anonymous access must redirect: ${route}`);
        assert.equal(new URL(page.url()).searchParams.get("next"), route);
        assert.equal(await page.getByRole("button", { name: "Sign in", exact: true }).isDisabled(), true);
      }
      await page.screenshot({ path: `verification/${width}-${route.replaceAll("/", "_") || "home"}.png`, fullPage: true });
      if (overflow) failures.push(`${width}px ${route} horizontal overflow`);
      console.log(`${overflow ? "FAIL" : "PASS"} ${width}px ${route}`);
    }
    assert.deepEqual(errors, [], `${width}px browser errors: ${JSON.stringify(errors)}`);
    await page.close();
  }
  const page = await browser.newPage();
  for (const next of ["https://evil.test", "//evil.test", "/\\evil.test", "/organizer/events"]) {
    const response = await page.request.get(`http://127.0.0.1:3000/auth/callback?error=access_denied&next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
    assert.equal(response.status(), 303);
    const location = response.headers().location;
    assert.ok(location.startsWith("/login?error=callback&next="));
    assert.ok(!location.includes("evil.test"));
  }
  const response = await page.request.get("http://127.0.0.1:3000/auth/callback?code=invalid", { maxRedirects: 0 });
  assert.equal(response.status(), 303);
  assert.ok(response.headers()["cache-control"].includes("no-store"));
  await page.close();
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
}
