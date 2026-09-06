"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/wordmark";
import { DonateButton } from "@/components/donate-button";
import { CartBadge } from "@/components/cart-badge";

const links = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/archive", label: "Archive" },
  { href: "/contact", label: "Contact" },
];

/** Compact smallcaps version — used in the mobile band only. */
function TaxExemptCompact() {
  return (
    <p className="smallcaps text-[0.65rem] tracking-[0.16em] text-cream/80">
      <span>Tax exempt under section 501(c)(3)</span>
      <span className="text-cream/50"> · </span>
      <span className="text-cream/50">Federal Tax ID 42-2139154</span>
    </p>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-maroon-deep text-cream/90">
      {/* Main nav row — bordered on desktop only (mobile gets its border from the tax band) */}
      <div className="md:border-b md:border-cream/15">
        <div className="container-edge flex items-stretch justify-between gap-6 py-2 md:py-3">
          {/* LEFT: logo + brand text stack */}
          <Link
            href="/"
            className="inline-flex flex-col items-center gap-2 text-center"
            aria-label="Raaga Sudha Sabha — home"
          >
            <Wordmark size="lg" className="h-20 md:h-24" />
            <span className="font-display italic leading-none text-2xl text-cream md:text-3xl">
              Raaga Sudha Sabha
            </span>
          </Link>

          {/* RIGHT (desktop): nav vertically centered, tax-exempt anchored to the bottom */}
          <div className="hidden flex-col items-end md:flex">
            <div className="flex flex-1 items-center">
              <nav className="flex items-center gap-8" aria-label="Primary">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="smallcaps text-base text-cream/80 transition hover:text-gold"
                  >
                    {l.label}
                  </Link>
                ))}
                <DonateButton variant="nav">Donate</DonateButton>
                <CartBadge />
              </nav>
            </div>

            <p className="font-display italic leading-tight text-right text-lg text-cream md:text-xl">
              Tax exempt under section 501(c)(3) · Federal Tax ID 42-2139154
            </p>
          </div>

          {/* MOBILE: cart stays reachable without opening the menu */}
          <div className="flex items-start gap-1 md:hidden">
            <CartBadge className="h-11 w-11 justify-center" />
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
              className="flex h-11 w-11 items-center justify-center text-cream"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-nav"
        className={cn(
          "border-t border-cream/15 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav
          className="container-edge flex flex-col py-3"
          aria-label="Primary mobile"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="smallcaps min-h-11 border-b border-cream/15 py-3 text-cream/80"
            >
              {l.label}
            </Link>
          ))}
          <CartBadge
            showLabel
            onNavigate={() => setOpen(false)}
            className="min-h-11 border-b border-cream/15 py-3"
          />
          <div className="mt-3">
            <DonateButton variant="nav" className="w-full justify-center">
              Donate
            </DonateButton>
          </div>
        </nav>
      </div>

      {/* Tax-exempt band — mobile only; on desktop the line lives in the right column above */}
      <div className="border-b border-cream/15 bg-maroon-deep md:hidden">
        <div className="container-edge py-1.5 text-center">
          <TaxExemptCompact />
        </div>
      </div>
    </header>
  );
}
