import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { Ornament } from "@/components/ornament";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review your Raaga Sudha Sabha concert tickets before checkout.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <>
      <section className="border-b border-pink bg-cream">
        <div className="container-edge py-12 md:py-16">
          <p className="kicker">Tickets</p>
          <Ornament className="mt-4 h-3 w-24 text-brand-purple/70" />
          <h1 className="mt-5 font-display text-display-lg text-maroon">
            Your cart
          </h1>
        </div>
      </section>

      <section className="bg-cream-deep/30">
        <div className="container-edge py-12 md:py-16">
          <CartView />
        </div>
      </section>
    </>
  );
}
