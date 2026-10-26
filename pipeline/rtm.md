# Requirements traceability matrix

Built by `npm run rtm` from pipeline/cases.json on 2026-10-21T20:24Z. No AI was used to build it.

| Rule | Requirement | Cases (evaluator verdict) |
|---|---|---|
| CAT-1 | The catalog lists every product with its name and price. | TC-01 (not evaluated) |
| CART-1 | A cart line holds a quantity from 1 to 10. | TC-02 (not evaluated) |
| CART-2 | After a failed payment the cart keeps its contents. | **none** |
| PRICE-1 | Subtotal = the sum of unit price × quantity. | **none** |
| PRICE-2 | Coupon `AGENT10` takes 10% off the subtotal, rounded half up to the cent. Codes are case-i | TC-03 (not evaluated) |
| PRICE-3 | Shipping is free when the subtotal after discount is **$100.00 or more**. Otherwise shippi | TC-04 (not evaluated), TC-05 (not evaluated) |
| PRICE-4 | Tax is 6% of the subtotal after discount (shipping is not taxed), rounded half up to the c | TC-06 (not evaluated) |
| PRICE-5 | Total = subtotal − discount + shipping + tax. | TC-07 (not evaluated) |
| PAY-1 | The amount charged equals the total shown on the checkout page. If the server's total diff | **none** |
| PAY-2 | A declined card shows the reason: "Your card was declined." / "Your card has insufficient  | TC-08 (not evaluated) |
| PAY-3 | Pressing Pay more than once creates one order and one charge. | TC-11 (not evaluated) |
| ORD-1 | Checkout creates the order as `PENDING`. | **none** |
| ORD-2 | An order becomes `PAID` only when Stripe reports `payment_intent.succeeded`. | TC-09 (not evaluated) |
| ORD-3 | An order becomes `PAYMENT_FAILED` when Stripe reports `payment_intent.payment_failed`. | **none** |
| ORD-4 | An order becomes `REFUNDED` when Stripe reports `charge.refunded`. A refunded order never  | **none** |
| ORD-5 | The confirmation page shows "Payment received" only when the ledger says `PAID`; until the | **none** |
| CRM-1 | A new email creates a customer with status `LEAD`. | **none** |
| CRM-2 | A customer becomes `ACTIVE_CUSTOMER` with their first `PAID` order. A failed payment never | TC-10 (not evaluated) |
| CRM-3 | A customer's total spent = the sum of their `PAID` orders. A refund subtracts the refunded | **none** |
| CRM-4 | A customer whose every paid order has been refunded becomes `REFUNDED`. | **none** |
| WH-1 | Every webhook must carry a valid Stripe signature. Anything else is rejected with HTTP 400 | TC-12 (not evaluated) |
| WH-2 | Each Stripe event is applied at most once, even when Stripe sends it again. | **none** |

## Coverage

11 of 22 rules have a case.

## Cases a script flags

- **TC-11** Pressing Pay multiple times creates exactly one order and one charge: expected result has nothing exact to check (an amount, a message, a status). Evaluator: not evaluated.
