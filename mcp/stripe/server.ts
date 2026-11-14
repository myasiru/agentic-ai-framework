import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import Stripe from "stripe";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// Load STRIPE_SECRET_KEY from .env (Node >= 20.12). Missing file is fine;
// the guard below aborts if the key is absent.
try {
  process.loadEnvFile(".env");
} catch {
  // .env not present; the key check below will fail loudly.
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is missing. Set it in .env and restart.");
  process.exit(1);
}
if (key.includes("_live_")) {
  console.error("Refusing to use a LIVE Stripe key. Set a sandbox test key (sk_test_...) in .env.");
  process.exit(1);
}

const stripe = new Stripe(key);

const LOG_FILE = join(process.cwd(), "artifacts", "stripe", "calls.log");

function logCall(tool: string, details: unknown) {
  try {
    mkdirSync(join(process.cwd(), "artifacts", "stripe"), { recursive: true });
    appendFileSync(
      LOG_FILE,
      `${new Date().toISOString()} ${tool} ${JSON.stringify(details)}\n`,
      { flag: "a" },
    );
  } catch {
    // Logging is best-effort; a failed append must not break the tool call.
  }
}

const server = new McpServer({ name: "stripe", version: "1.0.0" });

server.tool(
  "get_payment_intent",
  "Read a Stripe PaymentIntent: status, amount (cents), amount_refunded (cents).",
  { payment_intent_id: z.string().min(1) },
  { readOnlyHint: true },
  async ({ payment_intent_id }) => {
    logCall("get_payment_intent", { payment_intent_id });
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    // stripe-node v23 types no longer expose amount_refunded on PaymentIntent;
    // derive it from the PaymentIntent's refunds (succeeded + pending).
    const refunds = await stripe.refunds.list({ payment_intent: payment_intent_id, limit: 100 });
    const amount_refunded_cents = refunds.data
      .filter((r) => r.status === "succeeded" || r.status === "pending")
      .reduce((sum, r) => sum + r.amount, 0);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              payment_intent_id: pi.id,
              status: pi.status,
              amount_cents: pi.amount,
              amount_refunded_cents,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.tool(
  "list_events",
  "List Stripe webhook events for a PaymentIntent (matching events only).",
  { payment_intent_id: z.string().min(1) },
  { readOnlyHint: true },
  async ({ payment_intent_id }) => {
    logCall("list_events", { payment_intent_id });
    const matching: Array<{ id: string; type: string; created: number }> = [];
    for await (const event of stripe.events.list({ type: "payment_intent.*", limit: 100 })) {
      const obj = event.data?.object as { id?: string } | undefined;
      if (obj?.id === payment_intent_id) {
        matching.push({ id: event.id, type: event.type, created: event.created });
      }
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ payment_intent_id, matching_events: matching }, null, 2),
        },
      ],
    };
  },
);

server.tool(
  "refund_payment_intent",
  "Refund a Stripe PaymentIntent (full, or partial when amount_cents is given). " +
    "Calling this moves real money in the sandbox; pass confirm: true.",
  {
    payment_intent_id: z.string().min(1),
    amount_cents: z.number().int().positive().optional(),
    confirm: z.literal(true),
  },
  async ({ payment_intent_id, amount_cents, confirm }) => {
    logCall("refund_payment_intent", { payment_intent_id, amount_cents, confirm });
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      ...(amount_cents !== undefined ? { amount: amount_cents } : {}),
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { refund_id: refund.id, status: refund.status, amount_cents: refund.amount },
            null,
            2,
          ),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
