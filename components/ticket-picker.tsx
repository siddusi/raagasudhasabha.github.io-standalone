"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAvailability } from "@/lib/availability";
import { formatMoney, type Event } from "@/lib/events";
import {
  TICKETING_ENABLED,
  LOW_STOCK_THRESHOLD,
  SUPPORT_EMAIL,
} from "@/lib/commerce-config";
import { cn } from "@/lib/utils";

/**
 * The ticket-tier table on an event page: one row per tier with a quantity
 * stepper, remaining-seat count and price, then a running total and a link
 * through to the cart.
 */
export function TicketPicker({ event }: { event: Event }) {
  const { getQty, addQty, setQty, lines, ready } = useCart();
  const { remaining, state } = useAvailability(event.id);

  const eventLines = lines.filter((l) => l.eventId === event.id);
  const eventTotal = eventLines.reduce((s, l) => s + l.subtotalCents, 0);
  const eventCount = eventLines.reduce((s, l) => s + l.qty, 0);

  if (!TICKETING_ENABLED) {
    return (
      <section
        id="tickets"
        className="scroll-mt-44 border border-pink bg-cream/60"
      >
        <header className="border-b border-pink bg-brand-purple px-6 py-4">
          <h2 className="font-display text-2xl text-cream">Ticket Options</h2>
        </header>
        <div className="p-6 text-center md:p-10">
          <p className="font-display text-xl italic text-brand-purple">
            Tickets for this concert open soon.
          </p>
          <p className="mt-3 text-sm text-muted">
            Write to{" "}
            <a className="link-purple" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            to be notified when booking opens.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="tickets"
      className="scroll-mt-44 border border-pink bg-cream/60"
    >
      <header className="border-b border-pink bg-brand-purple px-6 py-4">
        <h2 className="font-display text-2xl text-cream">Ticket Options</h2>
      </header>

      <ul className="divide-y divide-pink">
        {event.tiers.map((tier) => {
          const qty = ready ? getQty(event.id, tier.id) : 0;

          // Only the Worker knows the true remaining count. If it can't be
          // reached we show nothing rather than asserting the full capacity
          // is still free — the count is re-checked server-side at capture
          // anyway, so an unknown count here cannot oversell the hall.
          const left =
            state === "ready" && tier.id in remaining
              ? remaining[tier.id]
              : null;

          const soldOut = left !== null && left <= 0;
          const ceiling = left === null
            ? tier.maxPerOrder
            : Math.min(tier.maxPerOrder, left);

          return (
            <li
              key={tier.id}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl text-maroon md:text-2xl">
                  {tier.name}
                </p>
                {tier.description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {tier.description}
                  </p>
                )}
                <RemainingBadge
                  left={left}
                  soldOut={soldOut}
                  loading={state === "loading"}
                />
              </div>

              <div className="flex items-center justify-between gap-5 sm:justify-end">
                {soldOut ? (
                  <span className="smallcaps text-muted">Sold out</span>
                ) : (
                  <Stepper
                    label={tier.name}
                    qty={qty}
                    max={ceiling}
                    onDec={() => addQty(event.id, tier.id, -1)}
                    onInc={() => addQty(event.id, tier.id, 1)}
                    onSet={(n) => setQty(event.id, tier.id, n)}
                  />
                )}

                <p
                  className={cn(
                    "w-24 text-right font-display text-2xl text-maroon",
                    soldOut && "text-muted line-through"
                  )}
                >
                  {formatMoney(tier.priceCents)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="flex flex-col gap-4 border-t border-pink bg-cream-deep/40 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <p className="font-display text-xl text-maroon md:text-2xl">
          Total:{" "}
          <span className="font-semibold">{formatMoney(eventTotal)}</span>
          {eventCount > 0 && (
            <span className="ml-2 align-middle text-sm text-muted">
              ({eventCount} {eventCount === 1 ? "ticket" : "tickets"})
            </span>
          )}
        </p>

        {eventCount > 0 ? (
          <Link
            href="/cart"
            className="smallcaps inline-flex min-h-12 items-center justify-center gap-2 border border-maroon bg-maroon px-6 py-3 text-cream transition hover:bg-maroon-deep"
          >
            <ShoppingCart size={16} aria-hidden="true" />
            Register for this event
          </Link>
        ) : (
          <p className="text-sm text-muted">
            Choose a quantity above to continue.
          </p>
        )}
      </footer>
    </section>
  );
}

function RemainingBadge({
  left,
  soldOut,
  loading,
}: {
  left: number | null;
  soldOut: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="mt-2 h-5 w-32 animate-pulse bg-pink/50" aria-hidden="true" />
    );
  }
  if (left === null) return null;
  if (soldOut) {
    return (
      <p className="smallcaps mt-2 inline-block bg-maroon/10 px-2 py-1 text-maroon">
        Sold out
      </p>
    );
  }
  const low = left <= LOW_STOCK_THRESHOLD;
  return (
    <p
      className={cn(
        "smallcaps mt-2 inline-block px-2 py-1",
        low ? "bg-maroon/10 text-maroon" : "bg-brand-purple/10 text-brand-purple"
      )}
    >
      {low ? `Only ${left} left` : `${left} tickets remaining`}
    </p>
  );
}

function Stepper({
  label,
  qty,
  max,
  onDec,
  onInc,
  onSet,
}: {
  label: string;
  qty: number;
  max: number;
  onDec: () => void;
  onInc: () => void;
  onSet: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDec}
        disabled={qty <= 0}
        aria-label={`Remove one ${label}`}
        className="flex h-11 w-11 items-center justify-center border border-pink-deep bg-cream text-maroon transition hover:bg-pink/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus size={18} aria-hidden="true" />
      </button>

      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        value={qty}
        aria-label={`Quantity of ${label}`}
        // Empty sends NaN, which the cart reads as "no change" — see cart-view.
        onChange={(e) =>
          onSet(e.target.value === "" ? NaN : Number(e.target.value))
        }
        className="h-11 w-16 border border-pink-deep bg-cream text-center font-display text-xl text-maroon [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={onInc}
        disabled={qty >= max}
        aria-label={`Add one ${label}`}
        className="flex h-11 w-11 items-center justify-center border border-pink-deep bg-cream text-maroon transition hover:bg-pink/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
