/**
 * Commerce configuration — ticketing, cart and PayPal checkout.
 *
 * ── What lives where ────────────────────────────────────────────────────────
 * This site is a static export on GitHub Pages, so there is no Node runtime.
 * Anything that must be trusted (real prices, remaining inventory, creating
 * and capturing the PayPal order) runs in a Cloudflare Worker — the same
 * pattern already used by /checkin. See worker/README.md.
 *
 * The browser only ever sends *what* was ordered (event id, tier id, qty).
 * It never sends an amount. The Worker re-prices the cart from its own copy
 * of the catalog before it creates the PayPal order, so a tampered client
 * cannot buy a $40 ticket for $0.01.
 *
 * ── Values ──────────────────────────────────────────────────────────────────
 * PAYPAL_CLIENT_ID is a public, publishable identifier — it is meant to ship
 * in client code. The matching *secret* belongs only in the Worker, set with
 * `npx wrangler secret put PAYPAL_CLIENT_SECRET`. Never put the secret here.
 *
 * To go live:
 *   1. Deploy the Worker (worker/README.md) and paste its URL below.
 *   2. Paste your PayPal *live* client ID below.
 *   3. Set PAYPAL_ENV to "live".
 *   4. Set TICKETING_ENABLED to true.
 */

/** Cloudflare Worker that prices carts and creates/captures PayPal orders. */
export const COMMERCE_API_URL =
  process.env.NEXT_PUBLIC_COMMERCE_API_URL ??
  "https://rss-tickets.mdeverkonda.workers.dev";

/** Public PayPal client ID. Sandbox value until the live one is pasted in. */
export const PAYPAL_CLIENT_ID =
  process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "sb";

/** "sandbox" while testing, "live" for real money. */
export const PAYPAL_ENV: "sandbox" | "live" =
  (process.env.NEXT_PUBLIC_PAYPAL_ENV as "sandbox" | "live") ?? "sandbox";

/**
 * Master switch. While false, ticket tiers still render but the buy controls
 * are replaced with a "tickets open soon" notice — useful before the Worker
 * and PayPal account are live, and between seasons.
 */
export const TICKETING_ENABLED = true;

/**
 * Show the "N tickets remaining" line. Requires the Worker's /availability
 * endpoint. Turn off to hide counts without disabling sales.
 */
export const SHOW_REMAINING = true;

/** Below this, the card switches to an urgent "Only N left" treatment. */
export const LOW_STOCK_THRESHOLD = 20;

export const SUPPORT_EMAIL = "info@raagasudhasabha.org";
