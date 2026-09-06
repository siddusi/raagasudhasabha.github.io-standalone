"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatMoney, formatEventRange } from "@/lib/events";
import { PayPalButtons, type Buyer } from "@/components/paypal-buttons";
import { TICKETING_ENABLED, SUPPORT_EMAIL } from "@/lib/commerce-config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CheckoutView() {
  const router = useRouter();
  const { lines, totalCents, count, ready, clear } = useCart();

  const [buyer, setBuyer] = useState<Buyer>({
    name: "",
    email: "",
    phone: "",
  });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(
    () => lines.map((l) => ({ eventId: l.eventId, tierId: l.tierId, qty: l.qty })),
    [lines]
  );

  const nameOk = buyer.name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(buyer.email.trim());
  const formOk = nameOk && emailOk;

  const onSuccess = (reference: string) => {
    clear();
    router.push(`/order/?ref=${encodeURIComponent(reference)}`);
  };

  if (!ready) {
    return (
      <div className="border border-pink bg-cream/60 p-10" aria-busy="true">
        <div className="h-6 w-48 animate-pulse bg-pink/50" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border border-pink bg-cream/60 p-10 text-center md:p-16">
        <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
          There is nothing to check out.
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

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* DETAILS + PAYMENT */}
      <div className="lg:col-span-7">
        <section className="border border-pink bg-cream p-6 md:p-8">
          <h2 className="font-display text-2xl text-maroon">Your details</h2>
          <p className="mt-2 text-sm text-muted">
            Tickets and the entry QR code are emailed to the address below.
          </p>

          <div className="mt-6 space-y-5">
            <Field
              id="name"
              label="Full name"
              required
              value={buyer.name}
              invalid={touched && !nameOk}
              hint="Please enter the name the tickets should be issued in."
              onChange={(v) => setBuyer((b) => ({ ...b, name: v }))}
              onBlur={() => setTouched(true)}
              autoComplete="name"
            />
            <Field
              id="email"
              label="Email address"
              required
              type="email"
              value={buyer.email}
              invalid={touched && !emailOk}
              hint="We need a valid email to send your tickets."
              onChange={(v) => setBuyer((b) => ({ ...b, email: v }))}
              onBlur={() => setTouched(true)}
              autoComplete="email"
            />
            <Field
              id="phone"
              label="Phone (optional)"
              type="tel"
              value={buyer.phone}
              onChange={(v) => setBuyer((b) => ({ ...b, phone: v }))}
              autoComplete="tel"
            />
          </div>
        </section>

        <section className="mt-8 border border-pink bg-cream p-6 md:p-8">
          <h2 className="font-display text-2xl text-maroon">Payment</h2>
          <p className="mt-2 text-sm text-muted">
            Pay with PayPal, Venmo, or any major credit or debit card — no
            PayPal account required for card payments.
          </p>

          {!formOk && (
            <p className="mt-5 border border-pink bg-cream-deep/40 px-4 py-3 text-sm text-ink/80">
              Enter your name and email above to enable payment.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 flex gap-3 border border-maroon/40 bg-maroon/5 p-4"
            >
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0 text-maroon"
                aria-hidden="true"
              />
              <p className="text-sm text-ink/85">{error}</p>
            </div>
          )}

          <div className="mt-6">
            {TICKETING_ENABLED ? (
              <PayPalButtons
                items={items}
                buyer={buyer}
                disabled={!formOk}
                onError={setError}
                onSuccess={onSuccess}
              />
            ) : (
              <p className="border border-pink bg-cream-deep/40 px-4 py-3 text-sm text-ink/80">
                Online payment is not open yet. Write to{" "}
                <a className="link-purple" href={`mailto:${SUPPORT_EMAIL}`}>
                  {SUPPORT_EMAIL}
                </a>{" "}
                to reserve seats.
              </p>
            )}
          </div>

          <ul className="mt-6 space-y-2 text-xs text-muted">
            <li className="flex items-center gap-2">
              <Lock size={14} aria-hidden="true" />
              Card details are entered on PayPal&rsquo;s servers — they never
              touch this site.
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck size={14} aria-hidden="true" />
              Your total is re-checked against our records before the payment
              is taken.
            </li>
          </ul>
        </section>
      </div>

      {/* SUMMARY */}
      <aside className="lg:col-span-5">
        <div className="sticky top-40 border border-pink bg-cream p-6 md:p-8">
          <h2 className="font-display text-2xl text-maroon">Order summary</h2>

          <ul className="mt-6 space-y-5">
            {lines.map((line) => (
              <li
                key={`${line.eventId}:${line.tierId}`}
                className="border-b border-pink pb-5 last:border-0 last:pb-0"
              >
                <p className="font-display text-lg leading-snug text-maroon">
                  {line.event.title}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatEventRange(line.event)}
                </p>
                <div className="mt-2 flex items-baseline justify-between gap-4">
                  <span className="text-sm text-ink/85">
                    {line.tier.name} × {line.qty}
                  </span>
                  <span className="font-display text-lg text-maroon">
                    {formatMoney(line.subtotalCents)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-pink pt-5">
            <div>
              <span className="font-display text-xl text-maroon">Total</span>
              <span className="ml-2 text-sm text-muted">
                ({count} {count === 1 ? "ticket" : "tickets"})
              </span>
            </div>
            <span className="font-display text-3xl text-maroon">
              {formatMoney(totalCents)}
            </span>
          </div>

          <Link
            href="/cart"
            className="smallcaps mt-6 inline-block text-muted underline-offset-4 transition hover:text-maroon hover:underline"
          >
            ← Edit cart
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  required = false,
  invalid = false,
  hint,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  required?: boolean;
  invalid?: boolean;
  hint?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="smallcaps block text-muted">
        {label}
        {required && <span className="ml-1 text-maroon">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        aria-describedby={invalid && hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`mt-2 h-12 w-full border bg-cream px-4 text-ink transition ${
          invalid ? "border-maroon" : "border-pink-deep"
        }`}
      />
      {invalid && hint && (
        <p id={`${id}-hint`} className="mt-2 text-sm text-maroon">
          {hint}
        </p>
      )}
    </div>
  );
}
