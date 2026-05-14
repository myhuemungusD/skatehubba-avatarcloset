import { expect, test } from '@playwright/test';

test('landing page renders the project heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SkateHubba: Avatar Closet' })).toBeVisible();
});
