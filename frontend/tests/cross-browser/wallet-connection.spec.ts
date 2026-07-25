import { test, expect } from "@playwright/test";

test.describe("Wallet connection flow", () => {
  test("login/sign up button is visible for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/");
    const loginButton = page.getByRole("button", {
      name: /Open login or sign up modal/i,
    });
    await expect(loginButton).toBeVisible();
  });

  test("login modal opens when button is clicked", async ({ page }) => {
    await page.goto("/");
    const loginButton = page.getByRole("button", {
      name: /Open login or sign up modal/i,
    });
    await loginButton.click();
    await expect(page.locator("[role='dialog']")).toBeVisible({ timeout: 5000 });
  });

  test("network capability badge renders", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const badge = page.locator('[aria-label*="network"], [class*="network"]').first();
    await expect(badge).toBeVisible({ timeout: 5000 });
  });
});
