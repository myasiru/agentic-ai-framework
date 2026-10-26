# Test plan: Zinc Store

## Scope

In scope:
- End-to-end checkout flow on the Zinc Store storefront (http://localhost:3000).
- Pricing engine (subtotal, discount, shipping threshold, tax, total) per PRICE-*.
- Payment outcomes with Stripe test PaymentMethods and order states per PAY-* and ORD-*.
- Three-way consistency: storefront, Stripe sandbox, and CRM ledger, verified via `npm run witness -- <order id>`.

Out of scope:
- Load/performance, cross-browser UX, Stripe SDK internals.
- Admin flows not exposed in `.cydeo/contract.md` (no test ids for product management).

## Approach

- Boundary-value analysis for price thresholds: $99.99 vs $100.00 subtotal (PRICE-3), quantity limits 1 and 10 (CART-1), and cent-level rounding (PRICE-2/PRICE-4).
- Decision tables for coupon validity (valid/invalid/case variants) (PRICE-2) crossed with shipping tier (PRICE-3).
- State-transition testing for order lifecycle (PENDING → PAID/FAIL/REFUNDED) and customer lifecycle (LEAD → ACTIVE_CUSTOMER → REFUNDED) using Stripe events.
- Negative tests for each decline reason (PAY-2), idempotent Pay button (PAY-3), and invalid webhooks (WH-1).
- Assertions use `page.getByTestId(<id>)` from `.cydeo/contract.md` only; test emails use `e2e-` prefix; money is integer cents.

## Traceability

| Rule | What we will check | Planned cases |
|---|---|---|
| CAT-1 | Product name and price appear on catalog cards | 1: TC-CAT-001 |
| CART-1 | Quantity can be set between 1 and 10 | 2: TC-CART-001, TC-CART-002 |
| CART-2 | Cart persists after a failed payment | 1: TC-CART-003 |
| PRICE-1 | Line subtotal = unit price × quantity | 1: TC-PRICE-001 |
| PRICE-2 | `AGENT10` (any case) gives 10%, other codes rejected | 3: TC-PRICE-002A/B/C |
| PRICE-3 | Shipping is $7.99 below $100, free at/above | 2: TC-PRICE-003A/B |
| PRICE-4 | Tax is 6% of discounted subtotal, rounded half up | 2: TC-PRICE-004A/B |
| PRICE-5 | Total formula matches displayed total | 1: TC-PRICE-005 |
| PAY-1 | Charge amount equals checkout total; mismatch blocks pay with "Your total changed." | 2: TC-PAY-001A/B |
| PAY-2 | Decline reasons match Stripe messages | 3: TC-PAY-002A/B/C |
| PAY-3 | Repeated Pay clicks produce one order/charge | 1: TC-PAY-003 |
| ORD-1 | New order starts as PENDING | 1: TC-ORD-001 |
| ORD-2 | Order becomes PAID on `payment_intent.succeeded` | 1: TC-ORD-002 |
| ORD-3 | Order becomes PAYMENT_FAILED on `payment_intent.payment_failed` | 1: TC-ORD-003 |
| ORD-4 | Refunded order stays REFUNDED, never returns to PAID | 1: TC-ORD-004 |
| ORD-5 | Confirmation page text and total reflect ledger/amount charged | 1: TC-ORD-005 |
| CRM-1 | New email creates a LEAD | 1: TC-CRM-001 |
| CRM-2 | First PAID order promotes LEAD to ACTIVE_CUSTOMER | 1: TC-CRM-002 |
| CRM-3 | Total spent updates for PAID orders and subtracts refunds | 2: TC-CRM-003A/B |
| CRM-4 | All paid orders refunded → REFUNDED status | 1: TC-CRM-004 |
| WH-1 | Missing/invalid signature returns 400 and changes nothing | 2: TC-WH-001A/B |
| WH-2 | Duplicate Stripe event is applied once | 1: TC-WH-002 |

## Risks

1. PAY-1 charge mismatch: If the server total drifts from the checkout UI, the store must block the charge; a false success would over/under-charge customers.
2. WH-1/WH-2 webhook handling: Invalid or duplicate events must not corrupt order/ledger state; signature verification bugs are hard to detect without direct webhook injection.
3. CRM-3/CRM-4 refund accounting: Total spent and customer status depend on correctly subtracting refunded amounts and not double-counting events.

## Questions for the team

1. What is the expected confirmation-page wait behavior when Stripe's webhook is delayed — should the UI poll, and what timeout/error state should be shown? (ORD-5)
2. Is there a maximum cart quantity above 10, and should the UI block, clamp, or show an error for invalid entries? (CART-1)
3. How should the store behave if a coupon is applied after the checkout page already loaded and totals differ — should it refresh or block payment? (PAY-1)
