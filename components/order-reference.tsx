"use client";

import { useSearchParams } from "next/navigation";

/**
 * Shows the PayPal order reference from ?ref=. Split into its own client
 * component so the confirmation page stays a server component and the
 * useSearchParams call sits inside a Suspense boundary.
 */
export function OrderReference() {
  const ref = useSearchParams().get("ref");
  if (!ref) return null;

  return (
    <p className="mt-8 inline-block border border-pink bg-cream-deep/40 px-6 py-4">
      <span className="smallcaps block text-muted">Reference number</span>
      <span className="mt-1 block font-mono text-lg tracking-wide text-maroon">
        {ref}
      </span>
    </p>
  );
}
