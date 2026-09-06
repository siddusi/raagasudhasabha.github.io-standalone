import Link from "next/link";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import {
  type Event,
  formatEventRange,
  formatMoney,
  isTicketed,
  lowestPriceCents,
} from "@/lib/events";
import { cn } from "@/lib/utils";

type Props = {
  event: Event;
  variant?: "grid" | "featured";
};

export function EventCard({ event, variant = "grid" }: Props) {
  const featured = variant === "featured";
  const ticketed = isTicketed(event);
  const from = lowestPriceCents(event);
  const href = `/events/${event.id}`;

  return (
    <article
      className={cn(
        // h-full so a grid cell's card fills the stretched row height —
        // that's what gives mt-auto below something to push against.
        "group flex h-full flex-col border border-pink bg-cream/70 transition hover:border-pink-deep",
        featured && "md:flex-row md:items-stretch"
      )}
    >
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          // Concert flyers are tall posters (the June 7 one is 879×1600).
          // A portrait box keeps the letterboxing minimal; `md:aspect-auto`
          // lets the featured variant stretch to the row height instead.
          "block shrink-0 overflow-hidden bg-cream-deep/40",
          featured ? "aspect-[3/4] md:aspect-auto md:w-2/5" : "aspect-[3/4]"
        )}
      >
        {event.image ? (
          // Plain <img>: next/image's optimizer is unavailable under
          // `output: "export"`, and these are already right-sized flyers.
          //
          // `object-contain`, not cover: a flyer is a composed poster, so
          // cropping it cuts the artists' faces and the title off. Contain
          // shows the whole thing and copes with any aspect ratio a future
          // flyer arrives in; the padding reads as a mount around the print.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain object-center p-3 transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <PlaceholderArt title={event.title} />
        )}
      </Link>

      <div className={cn("flex flex-1 flex-col p-6", featured && "md:p-8")}>
        <h3
          className={cn(
            "font-display text-2xl leading-snug text-maroon",
            featured && "md:text-3xl"
          )}
        >
          <Link
            href={href}
            className="transition hover:text-brand-purple focus-visible:text-brand-purple"
          >
            {event.title}
          </Link>
        </h3>

        <p className="mt-2 font-display italic leading-snug text-ink/85">
          {event.artists.join(" · ")}
        </p>

        {ticketed && from !== null ? (
          <p className="mt-3 text-sm text-brand-purple">
            Price starts from{" "}
            <span className="font-semibold">{formatMoney(from)}</span>
          </p>
        ) : event.ticketing === "free" ? (
          <p className="mt-3 text-sm font-semibold text-brand-purple">
            Free admission
          </p>
        ) : null}

        <dl className="mt-4 space-y-2 text-sm text-muted">
          <div className="flex gap-2">
            <dt className="sr-only">Date</dt>
            <CalendarDays
              size={16}
              className="mt-0.5 shrink-0 text-brand-purple/70"
              aria-hidden="true"
            />
            <dd>{formatEventRange(event)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="sr-only">Location</dt>
            <MapPin
              size={16}
              className="mt-0.5 shrink-0 text-brand-purple/70"
              aria-hidden="true"
            />
            <dd>
              {event.venue} · {event.city}
            </dd>
          </div>
        </dl>

        {featured && (
          <p className="mt-4 max-w-xl leading-relaxed text-ink/85">
            {event.description}
          </p>
        )}

        {/*
          In the grid, `mt-auto` pins the actions to the bottom of the card so
          they line up across the row even when one title or date wraps to an
          extra line. The featured variant is a full-width row whose height is
          set by the flyer, so pushing its buttons down would just open a gap.
        */}
        <div
          className={cn(
            "flex flex-wrap gap-3",
            featured ? "mt-6" : "mt-auto pt-6"
          )}
        >
          {event.status === "upcoming" && ticketed ? (
            <Link
              href={`${href}#tickets`}
              className="smallcaps inline-flex min-h-11 items-center gap-2 border border-maroon bg-maroon px-5 py-2 text-cream transition hover:bg-maroon-deep"
            >
              <Ticket size={15} aria-hidden="true" />
              Buy tickets
            </Link>
          ) : null}

          <Link
            href={href}
            className="smallcaps inline-flex min-h-11 items-center border border-maroon/70 px-5 py-2 text-maroon transition hover:bg-maroon/10"
          >
            {event.status === "past" ? "Look back" : "Details"}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Cream-and-gold fallback so a card without a flyer still reads as a card. */
function PlaceholderArt({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream-deep to-pink/50 p-6">
      <span className="text-center font-display text-xl italic text-maroon/50">
        {title}
      </span>
    </div>
  );
}
