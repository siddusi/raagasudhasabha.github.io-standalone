"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { loadPayPal } from "@/lib/paypal";
import { COMMERCE_API_URL } from "@/lib/commerce-config";
import type { CartItem } from "@/lib/cart";

export type Buyer = { name: string; email: string; phone: string };

type Props = {
  items: CartItem[];
  buyer: Buyer;
  /** Latest values without re-rendering the SDK buttons. */
  disabled: boolean;
  onError: (message: string) => void;
  onSuccess: (reference: string) => void;
};

/**
 * PayPal Buttons — PayPal, Venmo, Pay Later and guest card in one widget.
 *
 * The browser never sends an amount. It posts the cart (event + tier + qty)
 * and the Worker re-prices it against its own catalog before creating the
 * order, so the total shown here is advisory and the Worker's is binding.
 */
export function PayPalButtons({
  items,
  buyer,
  disabled,
  onError,
  onSuccess,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading"
  );

  // The SDK reads these through refs so we can mount the buttons once and
  // still see the current form values inside its callbacks. Re-rendering the
  // buttons on every keystroke would tear down PayPal's iframe mid-typing.
  const itemsRef = useRef(items);
  const buyerRef = useRef(buyer);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    itemsRef.current = items;
    buyerRef.current = buyer;
    disabledRef.current = disabled;
  }, [items, buyer, disabled]);

  useEffect(() => {
    let cancelled = false;

    loadPayPal()
      .then((paypal) => {
        if (cancelled || !container.current) return;
        container.current.innerHTML = "";

        paypal
          .Buttons({
            style: {
              layout: "vertical",
              shape: "rect",
              color: "gold",
              label: "pay",
              height: 48,
            },

            onClick: (_data: unknown, actions: any) => {
              // Last line of defence — the form should already be blocking.
              if (disabledRef.current) {
                onError("Please complete your details before paying.");
                return actions.reject();
              }
              return actions.resolve();
            },

            createOrder: async () => {
              const res = await fetch(`${COMMERCE_API_URL}/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  items: itemsRef.current,
                  buyer: buyerRef.current,
                }),
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || !json.id) {
                throw new Error(
                  json.error ?? "We could not start this payment."
                );
              }
              return json.id;
            },

            onApprove: async (data: { orderID: string }) => {
              const res = await fetch(
                `${COMMERCE_API_URL}/orders/${encodeURIComponent(
                  data.orderID
                )}/capture`,
                { method: "POST" }
              );
              const json = await res.json().catch(() => ({}));
              if (!res.ok || json.status !== "COMPLETED") {
                throw new Error(
                  json.error ?? "The payment could not be completed."
                );
              }
              onSuccess(json.reference ?? data.orderID);
            },

            onError: (err: unknown) => {
              onError(
                err instanceof Error
                  ? err.message
                  : "Something went wrong with the payment. You have not been charged."
              );
            },
          })
          .render(container.current)
          .then(() => !cancelled && setStatus("ready"))
          .catch(() => !cancelled && setStatus("failed"));
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
    // Mount once. Live values are read through the refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "failed") {
    return (
      <div className="flex gap-3 border border-maroon/40 bg-maroon/5 p-5">
        <AlertCircle
          size={20}
          className="mt-0.5 shrink-0 text-maroon"
          aria-hidden="true"
        />
        <div>
          <p className="font-display text-lg text-maroon">
            Payment is unavailable right now
          </p>
          <p className="mt-1 text-sm text-ink/80">
            We couldn&rsquo;t reach PayPal. Please check your connection and
            reload, or write to us and we&rsquo;ll reserve your seats by hand.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {status === "loading" && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-12 animate-pulse bg-pink/50" />
          <div className="h-12 animate-pulse bg-pink/40" />
        </div>
      )}
      <div
        ref={container}
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      />
    </div>
  );
}
