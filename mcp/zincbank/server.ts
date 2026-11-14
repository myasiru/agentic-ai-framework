import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Load ZINCBANK_USERNAME / ZINCBANK_PASSWORD from .env. Missing file is fine;
// the guard below aborts if the credentials are absent.
try {
  process.loadEnvFile(".env");
} catch {
  // .env not present; the credential check below will fail loudly.
}

const BASE_URL = process.env.ZINC_BANK_URL ?? "https://zincbank.cydeo.io";
const EMAIL = process.env.ZINCBANK_USERNAME;
const PASSWORD = process.env.ZINCBANK_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("ZINCBANK_USERNAME / ZINCBANK_PASSWORD are missing. Set them in .env and restart.");
  process.exit(1);
}

let cookie = ""; // session cookie from /api/auth/login
let userId: string | null = null;

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
  const json = await res.json().catch(() => null) as { ok?: boolean; data?: { userId?: string | null } } | null;
  const setCookies = res.headers.getSetCookie?.() ?? [];
  if (!res.ok || json?.ok !== true) {
    return { ok: false as const, status: res.status, userId: null };
  }
  cookie = setCookies.map((c) => c.split(";")[0]).filter((c) => !/=$/.test(c)).join("; ");
  userId = json.data?.userId ?? null;
  return { ok: true as const, status: res.status, userId };
}

type ApiError = { code?: string; message?: string };

async function api(path: string, { method = "GET", body }: { method?: string; body?: unknown } = {}) {
  const attempt = async () => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), cookie },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON (HTML) response
    }
    return { status: res.status, json };
  };
  let r = await attempt();
  const j0 = r.json as { error?: { code?: string } } | null;
  const authError = r.status === 401 || j0?.error?.code === "UNAUTHENTICATED";
  if (authError) {
    await login();
    r = await attempt();
  }
  const j = r.json as { ok?: boolean; data?: unknown; error?: ApiError } | null;
  if (r.status >= 200 && r.status < 300 && j?.ok === true) {
    return { ok: true as const, data: j.data };
  }
  return { ok: false as const, status: r.status, error: (j?.error ?? { code: "HTTP", message: `HTTP ${r.status}` }) as ApiError };
}

const server = new McpServer({ name: "zincbank", version: "1.0.0" });

const text = (obj: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }] });
const failure = (status: number, error: ApiError) =>
  ({ content: [{ type: "text" as const, text: JSON.stringify({ ok: false, status, error }, null, 2) }] });

server.tool(
  "login",
  "Authenticate to ZincBank with the ZINCBANK_USERNAME / ZINCBANK_PASSWORD from .env and store the session.",
  {},
  async () => {
    const r = await login();
    return r.ok ? text({ ok: true, userId: r.userId }) : failure(r.status, { code: "LOGIN_FAILED", message: "login failed" });
  },
);

server.tool(
  "get_profile",
  "Read the signed-in ZincBank profile (name, email, phone).",
  {},
  async () => {
    const r = await api("/api/profile");
    return r.ok ? text(r.data) : failure(r.status, r.error);
  },
);

server.tool(
  "list_accounts",
  "List ZincBank accounts with balances (decimal string and integer cents).",
  {},
  async () => {
    const r = await api("/api/accounts");
    return r.ok ? text(r.data) : failure(r.status, r.error);
  },
);

server.tool(
  "get_dashboard",
  "Read the ZincBank dashboard summary: total deposit, accounts, card and recent transactions.",
  {},
  async () => {
    const r = await api("/api/dashboard");
    return r.ok ? text(r.data) : failure(r.status, r.error);
  },
);

server.tool(
  "list_transactions",
  "List transactions for one ZincBank account (money as integer cents).",
  { accountId: z.string().min(1) },
  async ({ accountId }) => {
    const r = await api(`/api/transactions?accountId=${encodeURIComponent(accountId)}`);
    return r.ok ? text(r.data) : failure(r.status, r.error);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
