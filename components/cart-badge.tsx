"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

/**
 * Cart affordance in the site nav. Renders nothing until the cart has been
 * read from localStorage, so the static export never flashes a wrong count.
 */
export function CartBadge({
  className,
  showLabel = false,
  onNavigate,
}: {
  className?: string;
  showLabel?: boolean;
  onNavigate?: () => void;
}) {
  const { count, ready } = useCart();
  const active = ready && count > 0;

  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      aria-label={
        active
          ? `Cart — ${count} ${count === 1 ? "ticket" : "tickets"}`
          : "Cart — empty"
      }
      className={cn(
        "relative inline-flex min-h-11 items-center gap-2 text-cream/80 transition hover:text-gold",
        className
      )}
    >
      <span className="relative inline-flex">
        <ShoppingCart size={22} aria-hidden="true" />
        {active && (
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[0.65rem] font-semibold leading-none text-maroon-deep"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      {showLabel && <span className="smallcaps">Cart</span>}
    </Link>
  );
}
