import { test, expect } from '@playwright/test';

// TC-08: Generic declined card shows the Stripe decline message
test('TC-08 Generic declined card shows the Stripe decline message', async ({ page }) => {
  await page.goto('/');
  
  // Add at least one item to the cart
  await page.getByTestId('catalog-cable-add-button').click();
  
  await page.getByTestId('header-cart-link').click();
  await expect(page.getByTestId('cart-cable-line')).toBeVisible();
  
  await page.getByTestId('cart-checkout-button').click();
  
  // Fill checkout form
  await page.getByTestId('checkout-name-input').fill('Test Decline');
  await page.getByTestId('checkout-email-input').fill(`e2e-decline-${Date.now()}@example.com`);
  
  // Select the generic decline card
  await page.getByTestId('checkout-card-declined').check();
  
  // Click pay button
  await page.getByTestId('checkout-pay-button').click();
  
  // Verify the decline message
  await expect(page.getByTestId('checkout-error-alert')).toHaveText('Your card was declined.');
});
