// Shared E2E test helpers
import { expect } from '@playwright/test';
import path from 'path';

/** Wait for a tool page to fully load (no loading spinner, content visible) */
export async function waitForToolLoad(page) {
  // Wait for the loading spinner to disappear
  await page.waitForLoadState('networkidle');
  // Wait for main content area
  await page.waitForSelector('[role="main"], main', { timeout: 10000 });
  // Ensure no "Something went wrong" error boundary
  const errorBoundary = page.getByText('Something went wrong');
  await expect(errorBoundary).not.toBeVisible({ timeout: 5000 }).catch(() => {
    // If error boundary is visible, fail with details
    throw new Error('ErrorBoundary triggered on page load');
  });
}

/** Navigate to a tool and wait for it to load */
export async function goToTool(page, toolPath) {
  await page.goto(toolPath);
  await waitForToolLoad(page);
}

/** Upload a file to a FileUpload component */
export async function uploadFile(page, filePath, selector = 'input[type="file"]') {
  const input = page.locator(selector).first();
  await input.setInputFiles(filePath);
}

/** Create a temporary test file and return its path */
export function testFilePath(name) {
  return path.join(process.cwd(), 'e2e', 'fixtures', name);
}

/** Check that a textarea or input has content */
export async function expectHasContent(page, selector) {
  const el = page.locator(selector).first();
  await expect(el).not.toHaveValue('');
}

/** Click a button by text and wait for response */
export async function clickButton(page, text) {
  await page.getByRole('button', { name: text }).first().click();
}

/** Type into an input/textarea identified by placeholder */
export async function typeInto(page, placeholder, text) {
  await page.getByPlaceholder(placeholder).first().fill(text);
}

/** Verify copy-to-clipboard button works (checks for "Copied" feedback) */
export async function verifyCopy(page, buttonText = 'Copy') {
  await page.getByText(buttonText, { exact: false }).first().click();
  await expect(page.getByText(/copied|✓/i).first()).toBeVisible({ timeout: 3000 });
}
