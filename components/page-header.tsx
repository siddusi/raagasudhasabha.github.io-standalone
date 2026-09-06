import { Ornament } from "@/components/ornament";

export function PageHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub: string;
}) {
  return (
    <section className="border-b border-pink bg-cream">
      <div className="container-edge py-14 md:py-20">
        <p className="kicker">{kicker}</p>
        <Ornament className="mt-5 h-3 w-24 text-brand-purple/70" />
        <h1 className="mt-5 font-display text-display-lg text-maroon">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/85">
          {sub}
        </p>
      </div>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-pink bg-cream/60 p-10 text-center md:p-14">
      <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
        {message}
      </p>
    </div>
  );
}
