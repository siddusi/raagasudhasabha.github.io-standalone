import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Ornament } from "@/components/ornament";
import { OrderReference } from "@/components/order-reference";
import { SUPPORT_EMAIL } from "@/lib/commerce-config";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "Your Raaga Sudha Sabha tickets are confirmed.",
  robots: { index: false, follow: false },
};

export default function OrderPage() {
  return (
    <section className="bg-cream">
      <div className="container-edge py-16 md:py-24">
        <div className="mx-auto max-w-readable text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple/10 text-brand-purple">
            <CheckCircle2 size={34} aria-hidden="true" />
          </span>

          <p className="kicker mt-8">Payment received</p>
          <Ornament className="mx-auto mt-4 h-3 w-24 text-brand-purple/70" />
          <h1 className="mt-5 font-display text-display-lg text-maroon">
            Your seats are booked
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-ink/85">
            Thank you for supporting Raaga Sudha Sabha. A confirmation email
            with your tickets and entry QR code is on its way — please bring it
            with you, on your phone or printed.
          </p>

          {/* useSearchParams needs a Suspense boundary under static export. */}
          <Suspense fallback={null}>
            <OrderReference />
          </Suspense>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/events"
              className="smallcaps inline-flex min-h-12 items-center border border-maroon bg-maroon px-6 py-3 text-cream transition hover:bg-maroon-deep"
            >
              Browse more concerts
            </Link>
            <Link
              href="/"
              className="smallcaps inline-flex min-h-12 items-center border border-maroon/70 px-6 py-3 text-maroon transition hover:bg-maroon/10"
            >
              Back to home
            </Link>
          </div>

          <p className="mt-10 text-sm text-muted">
            Nothing in your inbox after a few minutes? Check your spam folder,
            then write to{" "}
            <a className="link-purple" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            with your reference number.
          </p>
        </div>
      </div>
    </section>
  );
}
