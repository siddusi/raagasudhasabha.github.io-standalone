"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useCart, type CartLine as Line } from "@/lib/cart";
import { formatMoney, formatEventRange } from "@/lib/events";
import { cn } from "@/lib/utils";

export function CartView() {
  const { lines, totalCents, count, ready, addQty, setQty, removeLine, clear } =
    useCart();

  // Until localStorage is read, render a neutral placeholder rather than an
  // "empty cart" that would flash before the real contents appear.
  if (!ready) {
    return (
      <div className="border border-pink bg-cream/60 p-10" aria-busy="true">
        <div className="h-6 w-48 animate-pulse bg-pink/50" />
        <div className="mt-4 h-4 w-72 animate-pulse bg-pink/40" />
      </div>
    );
  }

  if (lines.length === 0) return <EmptyCart />;

  // Group lines by event so a multi-concert order reads as separate blocks.
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const existing = groups.get(line.eventId);
    if (existing) existing.push(line);
    else groups.set(line.eventId, [line]);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <div className="space-y-8">
          {Array.from(groups.entries()).map(([eventId, group]) => {
            const event = group[0].event;
            return (
              <section key={eventId} className="border border-pink bg-cream/70">
                <header className="border-b border-pink px-5 py-4 md:px-6">
                  <Link
                    href={`/events/${event.id}`}
                    className="font-display text-2xl text-maroon transition hover:text-brand-purple"
                  >
                    {event.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatEventRange(event)} · {event.venue}
                  </p>
                </header>

                <ul className="divide-y divide-pink">
                  {group.map((line) => (
                    <li
                      key={line.tierId}
                      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg text-maroon">
                          {line.tier.name}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {formatMoney(line.tier.priceCents)} each
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <QtyControl
                          label={line.tier.name}
                          qty={line.qty}
                          max={line.tier.maxPerOrder}
                          onDec={() => addQty(eventId, line.tierId, -1)}
                          onInc={() => addQty(eventId, line.tierId, 1)}
                          onSet={(n) => setQty(eventId, line.tierId, n)}
                        />

                        <p className="w-24 text-right font-display text-xl text-maroon">
                          {formatMoney(line.subtotalCents)}
                        </p>

                        <button
                          type="button"
                          onClick={() => removeLine(eventId, line.tierId)}
                          aria-label={`Remove ${line.tier.name} from cart`}
                          className="flex h-11 w-11 items-center justify-center text-muted transition hover:text-maroon"
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={clear}
          className="smallcaps mt-6 min-h-11 text-muted underline-offset-4 transition hover:text-maroon hover:underline"
        >
          Empty cart
        </button>
      </div>

      {/* SUMMARY */}
      <aside className="lg:col-span-4">
        <div className="sticky top-40 border border-pink bg-cream p-6">
          <h2 className="font-display text-2xl text-maroon">Order summary</h2>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Tickets</dt>
              <dd className="text-ink">{count}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-ink">{formatMoney(totalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Fees</dt>
              <dd className="text-ink">None</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-pink pt-5">
            <span className="font-display text-xl text-maroon">Total</span>
            <span className="font-display text-3xl text-maroon">
              {formatMoney(totalCents)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="smallcaps mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-maroon bg-maroon px-6 py-3 text-cream transition hover:bg-maroon-deep"
          >
            Proceed to checkout
            <ArrowRight size={16} aria-hidden="true" />
          </Link>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Prices are confirmed against our records at checkout. Raaga Sudha
            Sabha is a 501(c)(3); the portion of a Patron ticket above the
            standard admission price is tax-deductible.
          </p>
        </div>
      </aside>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="border border-pink bg-cream/60 p-10 text-center md:p-16">
      <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
        Your cart is empty.
      </p>
      <p className="mt-3 text-ink/80">
        Browse the season and pick your seats for an upcoming concert.
      </p>
      <Link
        href="/events"
        className="smallcaps mt-8 inline-flex min-h-12 items-center border border-maroon bg-maroon px-6 py-3 text-cream transition hover:bg-maroon-deep"
      >
        See upcoming concerts
      </Link>
    </div>
  );
}

function QtyControl({
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
  const btn =
    "flex h-11 w-11 items-center justify-center border border-pink-deep bg-cream text-maroon transition hover:bg-pink/40 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDec}
        aria-label={`Remove one ${label}`}
        className={btn}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={qty}
        aria-label={`Quantity of ${label}`}
        // An empty field sends NaN, which the cart treats as "no change", so
        // clearing the box to retype a number doesn't delete the row.
        onChange={(e) =>
          onSet(e.target.value === "" ? NaN : Number(e.target.value))
        }
        className="h-11 w-14 border border-pink-deep bg-cream text-center font-display text-lg text-maroon [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={onInc}
        disabled={qty >= max}
        aria-label={`Add one ${label}`}
        className={cn(btn)}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
