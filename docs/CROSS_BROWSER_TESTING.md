# Cross-Browser Testing

This project uses [Playwright](https://playwright.dev/) for cross-browser compatibility testing.

## Setup

Install dependencies from the `frontend/` directory:

```bash
npm install
npx playwright install
```

## Running Tests

```bash
# Run all cross-browser tests
npm run test:cross-browser

# Run with UI mode
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# View HTML report
npx playwright show-report
```

## Test Projects

| Project   | Browser        | Device Emulation |
|-----------|----------------|------------------|
| chromium  | Google Chrome  | Desktop Chrome   |
| firefox   | Mozilla Firefox| Desktop Firefox  |
| webkit    | Apple Safari   | Desktop Safari   |

## Test Files

| File | Description |
|------|-------------|
| `basic-page-load.spec.ts` | Verifies pages load without errors, navigation renders, no console errors |
| `wallet-connection.spec.ts` | Tests login button visibility, modal opening, network badge |
| `game-board-rendering.spec.ts` | Checks landing page sections, responsive layouts, CSS loading |

## Configuration

The Playwright config is at `frontend/playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:3000` (matches Next.js dev server)
- **Retries**: 2 in CI, 0 locally
- **Workers**: 1 in CI, auto locally
- **Web Server**: auto-starts `npm run dev` if not running

## CI Integration

Add to your CI workflow:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps
  working-directory: frontend

- name: Run cross-browser tests
  run: npm run test:cross-browser
  working-directory: frontend

- name: Upload test report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: frontend/playwright-report/
```

## Writing New Tests

Tests use `@playwright/test` and follow this pattern:

```ts
import { test, expect } from "@playwright/test";

test.describe("Feature name", () => {
  test("description of behavior", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("selector")).toBeVisible();
  });
});
```

Use `page.getByRole()` and `page.getByLabel()` for accessible selectors. Prefer role-based locators over CSS selectors.
