import { test, expect } from '@playwright/test';

// E2E: a player exhausts all attempts and sees the losing result.
// Assumes the app exposes data-testid hooks for the board, keyboard and result.
test('losing game flow shows session result', async ({ page }) => {
  await page.goto('/');

  const wrongGuesses = ['crane', 'slate', 'pound', 'light', 'fumes', 'bydgs'];
  for (const word of wrongGuesses) {
    for (const letter of word) {
      await page.getByRole('button', { name: letter, exact: true }).click();
    }
    await page.getByRole('button', { name: /enter/i }).click();
  }

  await expect(page.getByTestId('game-result')).toBeVisible();
  await expect(page.getByTestId('game-result')).toContainText(/lost|better luck|game over/i);
});
