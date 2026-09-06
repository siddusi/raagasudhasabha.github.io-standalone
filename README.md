# Raaga Sudha Sabha

Marketing site for **Raaga Sudha Sabha**, a 501(c)(3) cultural arts non-profit and sister initiative of [Raaga Sudha School of Music](https://www.raagasudha.net).

Production domain: `www.raagasudhasabha.org`

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS with custom design tokens
- `next/font` (Cormorant Garamond + Inter)
- `lucide-react` icons
- Static export (`output: 'export'`) — no Node runtime required to host

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export to ./out
npm run lint
```

The static build emits everything to `./out`. Any static host can serve it.

## Project layout

```
app/                    routes (App Router)
  layout.tsx            fonts, nav, footer, cart provider, OG/metadata
  page.tsx              Home — hero, mission, pillars, upcoming events, Endaro quote
  events/page.tsx       Events — upcoming (featured + grid) and past (by year)
  events/[slug]/        Per-event detail page with the ticket-tier picker
  cart/page.tsx         Shopping cart
  checkout/page.tsx     Buyer details + PayPal / Venmo / card payment
  order/page.tsx        Post-payment confirmation
  checkin/page.tsx      Volunteer QR scanner for door check-in
  about/ archive/ contact/
  sitemap.ts            /sitemap.xml
  robots.ts             /robots.txt
components/             UI components (server + client islands)
content/events.json     Source-of-truth events + ticket tiers
lib/events.ts           Typed accessors, money + date formatting
lib/cart.tsx            Cart context, localStorage-backed
lib/availability.ts     Live remaining-seat counts from the Worker
lib/commerce-config.ts  PayPal + Worker configuration
worker/                 Cloudflare Worker: pricing, inventory, PayPal
public/                 Static assets
raagasudha.github.io/   READ-ONLY reference snapshot of the parent site
```

## Editing content

- **Events** — edit [content/events.json](content/events.json). One object per concert:

  | Field | Notes |
  |---|---|
  | `id` | Also the URL slug — `/events/<id>`. Don't change it after tickets are sold; it keys the inventory counters. |
  | `title`, `artists[]`, `description` | Copy shown on cards and the detail page. |
  | `date`, `endDate` | ISO 8601 **with offset**, e.g. `2026-10-10T17:00:00-07:00`. Use `-07:00` for PDT, `-08:00` for PST. |
  | `venue`, `address`, `city` | Location block. |
  | `image` | Flyer path under `public/`, or `null` for a generated placeholder. |
  | `status` | `"upcoming"` or `"past"` — this alone moves an event between the two sections. |
  | `ticketing` | `"open"` (cart live), `"closed"`, `"free"` (RSVP flow), `"none"`. |
  | `tiers[]` | Ticket types — see below. Empty for free/past events. |
  | `ticketUrl` | Only for events ticketed by an outside partner. |

  Each entry in `tiers[]`:

  | Field | Notes |
  |---|---|
  | `id` | Stable per event — keys the inventory counter. |
  | `name`, `description` | e.g. "Senior / Student Ticket". |
  | `priceCents` | **Integer cents.** `4000` is $40.00. Never a decimal. |
  | `capacity` | Seats in this tier, or `null` for uncapped. |
  | `maxPerOrder` | Ceiling on the quantity stepper. |

  **After a concert:** flip its `status` to `"past"` and `ticketing` to `"closed"`.
  The home page pulls the next `"upcoming"` event automatically.
- **Page copy** — edit the page file directly (e.g. [app/about/page.tsx](app/about/page.tsx)).
- **Placeholders to swap** — see [CONTENT.md](CONTENT.md) for the full inventory.

## Design tokens

Defined in [tailwind.config.ts](tailwind.config.ts) and [app/globals.css](app/globals.css).

| Token | Hex | Role |
|---|---|---|
| `cream` | `#F4ECDD` | Page background |
| `cream-deep` | `#EFE3CB` | Card / surface |
| `maroon` | `#6B1F2A` | Headlines, primary CTAs, institutional voice |
| `brand-purple` | `#7A007F` | Inline links, kicker accents — exact parent-site purple, the family link |
| `pink` | `#EAC5D2` | Hairline borders, soft surfaces — pulled from parent site |
| `gold` | `#B08838` | Hairline ornaments only (fails AA on cream as type) |
| `ink` | `#2A1B14` | Body text |
| `muted` | `#7A6A56` | Captions, secondary text |

Fonts: Cormorant Garamond (display) + Inter (body), both via `next/font`.

## Deploy

The site is a fully static export. The `out/` directory is the deployable artifact.

### Netlify

1. Connect this repo in Netlify.
2. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `out`
3. (Optional) add a `netlify.toml`:
   ```toml
   [build]
     command = "npm run build"
     publish = "out"
   ```
4. Set the production domain to `www.raagasudhasabha.org` and add the `apex → www` redirect in Netlify DNS.

### Cloudflare Pages

1. Create a new Pages project from this repo.
2. Build settings:
   - **Framework preset:** Next.js (Static HTML Export)
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
   - **Node version:** 20
3. Add `www.raagasudhasabha.org` as a custom domain.

### Vercel

1. Import the repo. Vercel detects Next.js automatically.
2. Because the site uses `output: 'export'`, Vercel will serve the static export — no serverless runtime billed.

## Ticketing & payments

Tickets are sold through **PayPal Commerce**, which covers PayPal, Venmo,
Pay Later and guest credit/debit card in a single integration. Confirmed
501(c)(3) organisations pay **1.99% + $0.49** instead of 2.89% + $0.49 —
apply at <https://www.paypal.com/us/webapps/mpp/nonprofit>.

### How it fits together

```
Browser                        Cloudflare Worker              PayPal
───────                        ─────────────────              ──────
tier picker  ──add──▶ cart
cart (localStorage)
     │
     │  POST /orders
     │  {eventId, tierId, qty}  ──▶ re-price from catalog
     │      (no amounts!)           check inventory (KV)
     │                              hold seats (20 min TTL)
     │                                    │  create order  ──▶
     │  ◀──────────── order id ───────────┘
     │
     ├─ buyer pays in PayPal's iframe ──────────────────────▶
     │
     │  POST /orders/:id/capture ──▶ capture ────────────────▶
     │                              verify amount matches
     │                              commit inventory
     │                              POST order to Apps Script
     │  ◀──────── reference ────────┘        (email + QR)
     ▼
/order confirmation
```

**The browser never sends a price.** It sends only what was ordered; the
Worker re-prices every line from its own bundled copy of `events.json` and
verifies the captured amount before tickets are issued. This is the whole
reason the Worker exists — a static site cannot enforce a price or keep a
secret.

### Setup

Full instructions in [worker/README.md](worker/README.md). In short:

1. Deploy the Worker (`cd worker && npx wrangler deploy`) with a KV namespace
   and `PAYPAL_CLIENT_SECRET` set via `wrangler secret put`.
2. In [lib/commerce-config.ts](lib/commerce-config.ts), set `COMMERCE_API_URL`
   to the Worker URL and `PAYPAL_CLIENT_ID` to your **public** client id.
3. Set `PAYPAL_ENV` to `"live"` when you're done testing in sandbox.

Until step 1 is done the tier pickers still render, the cart works, and the
payment step shows a graceful "payment unavailable" notice. Remaining-seat
counts stay hidden until the Worker can supply real numbers.

Switches in `lib/commerce-config.ts`:

| Flag | Effect |
|---|---|
| `TICKETING_ENABLED` | `false` replaces all buy controls with "tickets open soon". |
| `SHOW_REMAINING` | `false` hides "N tickets remaining" without stopping sales. |
| `LOW_STOCK_THRESHOLD` | Below this, the badge switches to "Only N left". |

## Wiring up the remaining placeholder integrations

Search the codebase for `// TODO:` to find every placeholder. The big ones:

- **Donation link** — still disabled in [components/donate-button.tsx](components/donate-button.tsx). The PayPal account set up for ticketing can also take donations; point this at a PayPal donate link or reuse the checkout flow.
- **Newsletter signup** — currently no-op. [components/newsletter-form.tsx](components/newsletter-form.tsx). Wire to Mailchimp / Buttondown / ConvertKit.
- **Contact form** — currently no-op. [components/contact-form.tsx](components/contact-form.tsx). Easiest path: Formspree or Netlify Forms (works out of the box on Netlify with the `data-netlify="true"` attribute).
- **Email, mailing address, EIN, social URLs** — see [CONTENT.md](CONTENT.md).

## Accessibility

- Semantic HTML, `<main>` landmark, skip-to-content link.
- Touch targets ≥ 44px on mobile.
- Visible focus rings (`ring-2 ring-maroon`).
- Headings sequence per page (single `<h1>`, then `<h2>` groups).
- Maroon-on-cream and ink-on-cream pass WCAG AA at all sizes; gold is restricted to hairlines and decorative marks only.

## Reference

The folder [raagasudha.github.io/](raagasudha.github.io/) is a frozen copy of the parent site (`raagasudha.net`) used as the design source. Do not edit it from this repo — it's the read-only sibling reference.
