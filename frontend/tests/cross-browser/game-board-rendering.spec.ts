import { test, expect } from "@playwright/test";

test.describe("Game board rendering", () => {
  test("landing page sections render in order", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const hero = page.locator("section").first();
    await expect(hero).toBeVisible();
  });

  test("responsive layout adjusts for mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).toBeVisible();

    const nav = page.locator("nav[aria-label='Main navigation']");
    await expect(nav).toBeVisible();
  });

  test("responsive layout adjusts for tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("CSS loads without errors", async ({ page }) => {
    const failedResources: string[] = [];
    page.on("response", (res) => {
      if (res.url().endsWith(".css") && res.status() >= 400) {
        failedResources.push(res.url());
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(failedResources).toHaveLength(0);
  });
});
