import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";
import { Ornament } from "@/components/ornament";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Raaga Sudha Sabha ticket purchase.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <section className="border-b border-pink bg-cream">
        <div className="container-edge py-12 md:py-16">
          <p className="kicker">Secure Checkout</p>
          <Ornament className="mt-4 h-3 w-24 text-brand-purple/70" />
          <h1 className="mt-5 font-display text-display-lg text-maroon">
            Checkout
          </h1>
        </div>
      </section>

      <section className="bg-cream-deep/30">
        <div className="container-edge py-12 md:py-16">
          <CheckoutView />
        </div>
      </section>
    </>
  );
}
