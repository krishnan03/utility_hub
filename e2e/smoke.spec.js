// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('search bar is functional', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await search.fill('pdf');
    await page.waitForTimeout(300);
    // Should show results
    await expect(page.getByText(/PDF/i).first()).toBeVisible();
  });

  test('category page loads', async ({ page }) => {
    await page.goto('/category/document');
    await expect(page.locator('main')).toBeVisible();
  });

  test('tool page loads without error boundary', async ({ page }) => {
    await page.goto('/tools/developer/diff-checker');
    await expect(page.getByText('Something went wrong')).not.toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();
  });
});
