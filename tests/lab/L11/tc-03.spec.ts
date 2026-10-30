import { test, expect } from '@playwright/test';

// TC-03: Lowercase coupon 'agent10' applies a 10% discount (case-insensitive)
test('TC-03 Lowercase coupon \'agent10\' applies a 10% discount (case-insensitive)', async ({ page }) => {
  await page.goto('/');
  
  // Add 4 × stand ($25.00) = $100.00 subtotal
  for (let i = 0; i < 4; i++) {
    await page.getByTestId('catalog-stand-add-button').click();
  }
  
  await page.getByTestId('header-cart-link').click();
  await expect(page.getByTestId('cart-stand-line')).toBeVisible();
  
  // Verify initial subtotal
  await expect(page.getByTestId('cart-subtotal')).toHaveText('$100.00');
  
  // Apply coupon 'agent10' (lowercase)
  await page.getByTestId('cart-coupon-input').fill('agent10');
  await page.getByTestId('cart-coupon-apply-button').click();
  
  // Verify coupon message shows success and discount is $10.00
  await expect(page.getByTestId('cart-coupon-message')).not.toHaveText('');
  await expect(page.getByTestId('cart-discount')).toHaveText('−$10.00');
  
  // Team rule PAY-1: complete payment and verify order total
  await page.getByTestId('cart-checkout-button').click();
  await expect(page.getByTestId('checkout-total')).not.toHaveText('$0.00');
  const shown = await page.getByTestId('checkout-total').textContent();
  
  await page.getByTestId('checkout-name-input').fill('Test User');
  await page.getByTestId('checkout-email-input').fill(`l11-${Date.now()}@example.com`);
  await page.getByTestId('checkout-card-visa').check();
  await page.getByTestId('checkout-pay-button').click();
  
  await expect(page.getByTestId('order-total')).toHaveText(shown!, { timeout: 20_000 });
});
