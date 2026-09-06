# Ticketing Worker

The website is a static export on GitHub Pages, so it cannot keep a secret or
enforce a price. This Cloudflare Worker is the trusted half of checkout.

**The browser never sends an amount.** It posts `{eventId, tierId, qty}` and the
Worker re-prices every line from its own bundled copy of `content/events.json`
before creating the PayPal order, then re-checks the captured amount against
that figure before issuing tickets. A tampered client cannot buy a $40 ticket
for $0.01.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/availability?event=<id>` | Remaining seats per tier |
| `POST` | `/orders` | Re-price cart, hold seats, create PayPal order |
| `POST` | `/orders/:id/capture` | Capture payment, commit inventory, fulfil |

## One-time setup

```bash
cd worker
npm install -g wrangler          # or use npx below
npx wrangler login
```

**1. Create the KV namespace**

```bash
npx wrangler kv namespace create TICKETS
```

Paste the returned `id` into `wrangler.toml`.

**2. Get PayPal credentials**

At <https://developer.paypal.com> → Apps & Credentials, create a REST app.
You get a **Client ID** (public) and a **Secret** (private).

Do this twice — once under the *Sandbox* tab for testing, once under *Live*.

**3. Configure**

In `wrangler.toml` set `PAYPAL_CLIENT_ID`, `PAYPAL_ENV` and `ALLOWED_ORIGIN`.

Then set the secret — this never goes in a file:

```bash
npx wrangler secret put PAYPAL_CLIENT_SECRET
```

**4. Deploy**

```bash
npx wrangler deploy
```

Copy the deployed URL into `lib/commerce-config.ts` as `COMMERCE_API_URL`, and
put the same **public** client ID into `PAYPAL_CLIENT_ID` there.

## Nonprofit pricing

PayPal charges confirmed 501(c)(3) organisations **1.99% + $0.49** per
transaction instead of the standard 2.89% + $0.49. It is not automatic — apply
at <https://www.paypal.com/us/webapps/mpp/nonprofit>, and expect to supply your
IRS determination letter and EIN (42-2139154). On a $40 ticket that is $1.29
instead of $1.65.

## Fulfilment

If `FULFILLMENT_URL` is set, a completed order is POSTed to that Apps Script
endpoint after the buyer sees their confirmation, so ticket email and the QR
codes the `/checkin` scanner reads keep flowing through the pipeline you
already run. The payload:

```json
{
  "type": "ticket_order",
  "secret": "<FULFILLMENT_SECRET>",
  "reference": "PayPal capture id",
  "orderId": "PayPal order id",
  "buyer": { "name": "...", "email": "...", "phone": "..." },
  "items": [
    { "eventId": "...", "eventTitle": "...", "tierName": "...",
      "unitCents": 4000, "qty": 2, "lineCents": 8000 }
  ],
  "totalCents": 8000,
  "paidAt": "2026-08-23T...Z"
}
```

Have `code.gs` check `secret` against a Script Property before writing the row —
otherwise anyone who learns the `/exec` URL can forge orders.

## Inventory model

- `sold:<eventId>:<tierId>` — committed seats, incremented at capture.
- `resv:<eventId>:<tierId>:<orderId>:<qty>` — a hold placed when the order is
  created, with a 20-minute TTL so abandoned carts release themselves.
- `remaining = capacity − sold − reservations`.

**Known limit:** Workers KV is eventually consistent and has no transactions,
so two people buying the last seat in the same instant can both succeed. For a
150-seat hall selling over days this is very unlikely, and the failure mode is
one oversold seat rather than lost money. If you ever sell a fast-moving,
hard-capped event, move the counters to a Durable Object, which serialises
writes per key and removes the race entirely.

## Testing

Use the Sandbox credentials and a sandbox buyer account from the PayPal
developer dashboard. Cards, Venmo and PayPal balance can all be exercised
without real money.

```bash
npx wrangler dev            # local, with --remote to use real KV
```

Set `ALLOWED_ORIGIN = "*"` and point `COMMERCE_API_URL` at
`http://127.0.0.1:8787` while developing.

## Going live

1. Swap `PAYPAL_ENV` to `"live"` and the client id/secret to the live pair.
2. Set `ALLOWED_ORIGIN` to `https://www.raagasudhasabha.org`.
3. `npx wrangler deploy`.
4. Update `lib/commerce-config.ts`, set `PAYPAL_ENV` to `"live"`, rebuild the
   site.
5. Buy one real ticket yourself and refund it from the PayPal dashboard.
