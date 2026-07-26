import { test, expect } from "@playwright/test";

test.describe("Basic page load", () => {
  test("homepage loads and shows hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DeWordle/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigation links are visible", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav[aria-label='Main navigation']");
    await expect(nav).toBeVisible();
  });

  test("no console errors on initial load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("pages load without 5xx errors", async ({ page }) => {
    const responses: number[] = [];
    page.on("response", (res) => {
      if (res.status() >= 500) responses.push(res.status());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(responses).toHaveLength(0);
  });
});
