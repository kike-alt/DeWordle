import { test, expect } from '@playwright/test';

/**
 * QA-102: Visual regression tests for key DeWordle screens.
 * Snapshots are stored in e2e/__snapshots__ and committed to the repo.
 * Update baselines: npx playwright test --update-snapshots
 */
test.describe('Visual regression', () => {
  test('home page matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot()).toMatchSnapshot('home.png');
  });

  test('game board initial state', async ({ page }) => {
    await page.goto('/game');
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot()).toMatchSnapshot('game-board-initial.png');
  });

  test('game board after first guess', async ({ page }) => {
    await page.goto('/game');
    await page.waitForLoadState('networkidle');
    // Type a word and submit
    await page.keyboard.type('CRANE');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800); // animation settle
    expect(await page.screenshot()).toMatchSnapshot('game-board-first-guess.png');
  });

  test('leaderboard page', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot()).toMatchSnapshot('leaderboard.png');
  });

  test('game board mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/game');
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot()).toMatchSnapshot('game-board-mobile.png');
  });
});