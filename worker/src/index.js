/**
 * Raaga Sudha Sabha — ticketing Worker.
 *
 * The website is a static export on GitHub Pages, so this Worker is the only
 * trusted party in the checkout. It owns three things the browser must never
 * be allowed to decide:
 *
 *   1. PRICE      — carts arrive as {eventId, tierId, qty} with no amounts.
 *                   Every line is re-priced from the bundled catalog below,
 *                   which is the same content/events.json the site builds
 *                   from, so a tampered client cannot set its own total.
 *   2. INVENTORY  — remaining seats are tracked in KV, checked when the order
 *                   is created and re-checked before the money is captured.
 *   3. SECRETS    — the PayPal client secret lives here as a Worker secret
 *                   and is never shipped to a browser.
 *
 * Endpoints
 *   GET  /availability?event=<id>     → { remaining: { tierId: n } }
 *   POST /orders                      → { id }          (PayPal order id)
 *   POST /orders/:id/capture          → { status, reference, ... }
 *
 * See README.md in this directory for deployment.
 */

// Bundled at build time by wrangler/esbuild — one source of truth with the site.
import catalog from "../../content/events.json";

const RESERVATION_TTL_SECONDS = 20 * 60; // hold seats while the buyer pays

// ── helpers ────────────────────────────────────────────────────────────────

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(env),
    },
  });
}

function fail(message, status, env) {
  return json({ error: message }, status, env);
}

/** Money is integer cents everywhere internally; PayPal wants "40.00". */
function centsToAmount(cents) {
  return (cents / 100).toFixed(2);
}

function findEvent(eventId) {
  return catalog.find((e) => e.id === eventId) || null;
}

function findTier(event, tierId) {
  return (event.tiers || []).find((t) => t.id === tierId) || null;
}

// ── inventory ──────────────────────────────────────────────────────────────

const soldKey = (eventId, tierId) => `sold:${eventId}:${tierId}`;
const resvPrefix = (eventId, tierId) => `resv:${eventId}:${tierId}:`;

async function getSold(env, eventId, tierId) {
  const raw = await env.TICKETS.get(soldKey(eventId, tierId));
  return raw ? parseInt(raw, 10) || 0 : 0;
}

/**
 * Seats currently held by in-flight checkouts. Reservation keys carry a TTL,
 * so abandoned carts release themselves without a cleanup job.
 */
async function getReserved(env, eventId, tierId) {
  let total = 0;
  let cursor;
  do {
    const page = await env.TICKETS.list({
      prefix: resvPrefix(eventId, tierId),
      cursor,
    });
    for (const key of page.keys) {
      const n = parseInt(key.name.split(":").pop(), 10);
      if (Number.isFinite(n)) total += n;
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return total;
}

async function remainingFor(env, event, tier) {
  if (tier.capacity === null || tier.capacity === undefined) return null;
  const [sold, reserved] = await Promise.all([
    getSold(env, event.id, tier.id),
    getReserved(env, event.id, tier.id),
  ]);
  return Math.max(0, tier.capacity - sold - reserved);
}

// ── PayPal ─────────────────────────────────────────────────────────────────

function paypalBase(env) {
  return env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalToken(env) {
  const credentials = btoa(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
  );
  const res = await fetch(`${paypalBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed (${res.status})`);
  return (await res.json()).access_token;
}

// ── route: availability ────────────────────────────────────────────────────

async function handleAvailability(request, env) {
  const eventId = new URL(request.url).searchParams.get("event");
  if (!eventId) return fail("Missing ?event", 400, env);

  const event = findEvent(eventId);
  if (!event) return fail("Unknown event", 404, env);

  const remaining = {};
  for (const tier of event.tiers || []) {
    const left = await remainingFor(env, event, tier);
    if (left !== null) remaining[tier.id] = left;
  }

  return json({ eventId, remaining }, 200, env);
}

// ── route: create order ────────────────────────────────────────────────────

async function handleCreateOrder(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return fail("Malformed request", 400, env);
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const buyer = payload.buyer || {};

  if (items.length === 0) return fail("Your cart is empty.", 400, env);
  if (items.length > 20) return fail("Too many lines in one order.", 400, env);

  const name = String(buyer.name || "").trim();
  const email = String(buyer.email || "").trim();
  if (name.length < 2) return fail("A name is required.", 400, env);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("A valid email address is required.", 400, env);
  }

  // Re-price and check stock. Nothing the client sent about money is used.
  const priced = [];
  let totalCents = 0;

  for (const item of items) {
    const event = findEvent(String(item.eventId || ""));
    if (!event) return fail("That concert is no longer listed.", 409, env);
    if (event.ticketing !== "open") {
      return fail(`Tickets for ${event.title} are closed.`, 409, env);
    }

    const tier = findTier(event, String(item.tierId || ""));
    if (!tier) return fail("That ticket type is no longer offered.", 409, env);

    const qty = Math.floor(Number(item.qty));
    if (!Number.isFinite(qty) || qty < 1) {
      return fail("Invalid ticket quantity.", 400, env);
    }
    if (qty > tier.maxPerOrder) {
      return fail(
        `Up to ${tier.maxPerOrder} ${tier.name} tickets per order.`,
        400,
        env
      );
    }

    const left = await remainingFor(env, event, tier);
    if (left !== null && qty > left) {
      return fail(
        left === 0
          ? `${tier.name} for ${event.title} is sold out.`
          : `Only ${left} ${tier.name} tickets remain for ${event.title}.`,
        409,
        env
      );
    }

    const lineCents = tier.priceCents * qty;
    totalCents += lineCents;
    priced.push({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      tierId: tier.id,
      tierName: tier.name,
      unitCents: tier.priceCents,
      qty,
      lineCents,
    });
  }

  if (totalCents <= 0) return fail("Order total must be positive.", 400, env);

  // Create the PayPal order for the amount WE computed.
  const token = await paypalToken(env);
  const res = await fetch(`${paypalBase(env)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: "Raaga Sudha Sabha concert tickets",
          custom_id: email.slice(0, 127),
          amount: {
            currency_code: "USD",
            value: centsToAmount(totalCents),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: centsToAmount(totalCents),
              },
            },
          },
          items: priced.map((l) => ({
            name: `${l.eventTitle} — ${l.tierName}`.slice(0, 127),
            quantity: String(l.qty),
            unit_amount: {
              currency_code: "USD",
              value: centsToAmount(l.unitCents),
            },
            category: "DIGITAL_GOODS",
          })),
        },
      ],
      application_context: {
        brand_name: "Raaga Sudha Sabha",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
      },
    }),
  });

  const order = await res.json();
  if (!res.ok || !order.id) {
    console.error("PayPal create failed", JSON.stringify(order));
    return fail("We could not start this payment.", 502, env);
  }

  // Persist what this order is *for*, so capture never trusts the client.
  await env.TICKETS.put(
    `order:${order.id}`,
    JSON.stringify({ items: priced, totalCents, buyer: { name, email, phone: String(buyer.phone || "").trim() } }),
    { expirationTtl: RESERVATION_TTL_SECONDS }
  );

  // Hold the seats while the buyer is in PayPal's flow.
  await Promise.all(
    priced.map((l) =>
      env.TICKETS.put(`${resvPrefix(l.eventId, l.tierId)}${order.id}:${l.qty}`, "1", {
        expirationTtl: RESERVATION_TTL_SECONDS,
      })
    )
  );

  return json({ id: order.id }, 200, env);
}

// ── route: capture ─────────────────────────────────────────────────────────

async function handleCapture(orderId, env, ctx) {
  const stashed = await env.TICKETS.get(`order:${orderId}`, "json");
  if (!stashed) {
    return fail(
      "This checkout expired. Please go back to your cart and try again.",
      409,
      env
    );
  }

  const token = await paypalToken(env);
  const res = await fetch(
    `${paypalBase(env)}/v2/checkout/orders/${encodeURIComponent(
      orderId
    )}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // Makes a retried capture idempotent rather than double-charging.
        "PayPal-Request-Id": `capture-${orderId}`,
      },
    }
  );

  const result = await res.json();
  if (!res.ok || result.status !== "COMPLETED") {
    console.error("PayPal capture failed", JSON.stringify(result));
    return fail("The payment could not be completed.", 502, env);
  }

  // Confirm PayPal took exactly what we asked for before we issue tickets.
  const captured =
    result?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
  const expected = centsToAmount(stashed.totalCents);
  if (captured !== expected) {
    console.error(`Amount mismatch: captured ${captured}, expected ${expected}`);
    return fail(
      "Payment amount mismatch — please contact info@raagasudhasabha.org.",
      502,
      env
    );
  }

  // Commit inventory and release the holds.
  for (const line of stashed.items) {
    const key = soldKey(line.eventId, line.tierId);
    const sold = await getSold(env, line.eventId, line.tierId);
    await env.TICKETS.put(key, String(sold + line.qty));
    await env.TICKETS.delete(
      `${resvPrefix(line.eventId, line.tierId)}${orderId}:${line.qty}`
    );
  }
  await env.TICKETS.delete(`order:${orderId}`);

  const reference =
    result?.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

  // Record the order + send tickets through the existing Apps Script pipeline
  // (the same one that already handles RSVP email and /checkin QR codes).
  // Done after the response is committed so a slow Sheet never blocks the
  // buyer's confirmation.
  if (env.FULFILLMENT_URL) {
    ctx.waitUntil(
      fetch(env.FULFILLMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ticket_order",
          secret: env.FULFILLMENT_SECRET || "",
          reference,
          orderId,
          buyer: stashed.buyer,
          items: stashed.items,
          totalCents: stashed.totalCents,
          paidAt: new Date().toISOString(),
        }),
      }).catch((err) => console.error("Fulfilment post failed", err))
    );
  }

  return json(
    {
      status: "COMPLETED",
      reference,
      totalCents: stashed.totalCents,
      items: stashed.items,
    },
    200,
    env
  );
}

// ── entry ──────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (request.method === "GET" && path === "/availability") {
        return await handleAvailability(request, env);
      }

      if (request.method === "POST" && path === "/orders") {
        return await handleCreateOrder(request, env);
      }

      const capture = path.match(/^\/orders\/([^/]+)\/capture$/);
      if (request.method === "POST" && capture) {
        return await handleCapture(decodeURIComponent(capture[1]), env, ctx);
      }

      return fail("Not found", 404, env);
    } catch (err) {
      console.error(err);
      return fail("Unexpected error. You have not been charged.", 500, env);
    }
  },
};
