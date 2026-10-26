# Team context: Zinc Store
_Written by the context-researcher agent on Wednesday, October 21, 2026. Sources are listed at the end._

## What the product does
* The Zinc Store is an e-commerce platform where shoppers browse a catalog and add items to a cart.
* During checkout, the shopper pays using Stripe.
* The store system handles the order lifecycle (pending, paid, failed, refunded) and communicates with Stripe via webhooks.
* The CRM ledger acts as the source of truth for customer status and order history, updated based on payment outcomes.
* Three distinct systems (Storefront, Stripe, CRM ledger) must remain in sync; the witness tool verifies this alignment.

## Rules that matter most
* **PRICE-1:** Subtotal is unit price × quantity.
* **PRICE-2:** `AGENT10` coupon provides a 10% discount, case-insensitive.
* **PRICE-3:** Shipping is $7.99 if the subtotal after discount is < $100.00; otherwise, it is free.
* **PRICE-4:** Tax is 6% of the discounted subtotal (shipping excluded).
* **PAY-1:** Payment must match the checkout total exactly; otherwise, the store blocks charging and shows "Your total changed."
* **PAY-2:** Card decline reasons (insufficient funds, expired) must show the specific error message provided by Stripe.
* **ORD-2:** An order is only `PAID` upon `payment_intent.succeeded`.
* **CRM-1/CRM-2:** New email -> `LEAD`; first `PAID` order -> `ACTIVE_CUSTOMER`.

## Test data and test ids
* Checkout options rely on specific Stripe test `PaymentMethod` tokens:
  * **Success:** `pm_card_visa`
  * **Declined:** `pm_card_visa_chargeDeclined`
  * **Insufficient Funds:** `pm_card_visa_chargeDeclinedInsufficientFunds`
  * **Expired:** `pm_card_chargeDeclinedExpiredCard`
* All test emails must start with `e2e-` (e.g., `e2e-test-user@example.com`).
* Use only `data-testid` values defined in `.cydeo/contract.md` for UI interaction.

## Known bugs and risks
* No bugs are currently recorded in the ZincTM system.
* **Riskiest rules to test:**
  * **PAY-1:** Critical for preventing charge mismatches.
  * **WH-1/WH-2:** Webhook reliability and signature validation are central to system state.
  * **CRM-3/CRM-4:** Customer ledger status transitions depend on correct handling of refunds and paid orders.

## What ZincTM already holds
* **Test cases:** 0
* **Defects:** 0
* The ZincTM workspace is currently uninitialized regarding test cases and defects.

## Open questions
* None at this time.

## Sources
* PRD.md
* AGENTS.md
* .cydeo/contract.md
* package.json
* mcp__zinctm__tm_whoami
* mcp__zinctm__tm_list_test_cases
* mcp__zinctm__tm_list_defects
