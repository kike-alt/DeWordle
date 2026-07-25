import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA-105: Automated accessibility tests using axe-core.
 * WCAG 2.1 AA compliance checks for core game screens.
 */
test.describe('Accessibility audit', () => {
  test('home page has no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('game page has no critical a11y violations', async ({ page }) => {
    await page.goto('/game');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('.game-keyboard') // keyboard is tested separately
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('game keyboard is accessible', async ({ page }) => {
    await page.goto('/game');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .include('.game-keyboard')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('leaderboard has no critical a11y violations', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});