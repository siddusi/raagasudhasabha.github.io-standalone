import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { Ornament } from "@/components/ornament";
import { EventFlyer } from "@/components/event-flyer";
import { TicketPicker } from "@/components/ticket-picker";
import { RsvpModal } from "@/components/rsvp-modal";
import {
  getAllEvents,
  getEventById,
  isTicketed,
  formatEventDate,
  formatEventDay,
  formatEventTime,
  type Event,
} from "@/lib/events";
import { UpcomingBanner } from "@/components/upcoming-banner";
import {
  RSVP_OPEN,
  RSVP_GOOGLE_FORM_URL,
  RSVP_EVENT_LABEL,
  UPCOMING_BANNER_ONLY,
} from "@/lib/upcoming";
import { SUPPORT_EMAIL } from "@/lib/commerce-config";

type Params = { params: { slug: string } };

/** Required by `output: "export"` — pre-renders one page per event. */
export function generateStaticParams() {
  return getAllEvents().map((e) => ({ slug: e.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const event = getEventById(params.slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.description,
    openGraph: {
      title: event.title,
      description: event.description,
      images: event.image ? [event.image] : undefined,
    },
  };
}

export default function EventDetailPage({ params }: Params) {
  const event = getEventById(params.slug);
  if (!event) notFound();

  const { weekday } = formatEventDate(event.date);
  const ticketed = isTicketed(event);
  const isPast = event.status === "past";

  return (
    <>
      {/* HEADER */}
      <section className="border-b border-pink bg-cream">
        <div className="container-edge py-12 md:py-16">
          <Link
            href="/events"
            className="smallcaps inline-flex items-center gap-2 text-muted transition hover:text-maroon"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            All events
          </Link>

          <p className="kicker mt-6">
            {isPast ? "From the archive" : "On our stage"}
          </p>
          <Ornament className="mt-4 h-3 w-24 text-brand-purple/70" />
          <h1 className="mt-5 font-display text-display-lg text-maroon">
            {event.title}
          </h1>
          <p className="mt-4 max-w-3xl font-display text-xl italic leading-snug text-ink/85 md:text-2xl">
            {event.artists.join(" · ")}
          </p>
        </div>
      </section>

      {/* FACTS + FLYER */}
      <section className="border-b border-pink bg-cream-deep/30">
        <div className="container-edge grid gap-10 py-12 md:py-16 lg:grid-cols-12">
          <div className={event.image ? "lg:col-span-7" : "lg:col-span-12"}>
            {event.image && (
              <EventFlyer src={event.image} alt={`${event.title} — flyer`} />
            )}
          </div>

          <div className={event.image ? "lg:col-span-5" : "lg:col-span-8"}>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Fact icon={CalendarDays} label="Date">
                {weekday}, {formatEventDay(event)}
              </Fact>
              <Fact icon={Clock} label="Time">
                {formatEventTime(event)}
              </Fact>
              <Fact icon={MapPin} label="Location">
                {event.venue}
                {event.address && (
                  <>
                    <br />
                    <span className="text-muted">{event.address}</span>
                  </>
                )}
              </Fact>
            </dl>

            <div className="mt-8">
              <h2 className="font-display text-2xl text-maroon">
                About this concert
              </h2>
              <Ornament className="mt-4 h-3 w-20 text-brand-purple/70" />
              <p className="mt-5 leading-relaxed text-ink/85">
                {event.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BOOKING */}
      <section className="bg-cream">
        <div className="container-edge py-12 md:py-16">
          {/*
            While the season is held back, an upcoming concert's page must
            not still sell tickets — otherwise a shared link contradicts the
            "stay tuned" banner everywhere else. Past events are unaffected.
          */}
          {UPCOMING_BANNER_ONLY && event.status === "upcoming" ? (
            <UpcomingBanner />
          ) : ticketed ? (
            <TicketPicker event={event} />
          ) : (
            <BookingNotice event={event} />
          )}

          <p className="mt-8 text-sm text-muted">
            Questions about seating, accessibility or group bookings? Write to{" "}
            <a className="link-purple" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}

function BookingNotice({ event }: { event: Event }) {
  if (event.status === "past") {
    return (
      <div className="border border-pink bg-cream/60 p-10 text-center md:p-14">
        <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
          This concert has already taken place.
        </p>
        <Link
          href="/events"
          className="smallcaps mt-6 inline-flex min-h-12 items-center border border-maroon bg-maroon px-6 py-3 text-cream transition hover:bg-maroon-deep"
        >
          See upcoming concerts
        </Link>
      </div>
    );
  }

  if (event.ticketing === "free") {
    return (
      <div className="border border-pink bg-cream/60 p-10 text-center md:p-14">
        <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
          This concert is free to attend.
        </p>
        <p className="mt-3 text-ink/80">
          Seating is limited, so please RSVP to reserve your place.
        </p>
        {RSVP_OPEN && (
          <div className="mt-6 flex justify-center">
            <RsvpModal
              formUrl={RSVP_GOOGLE_FORM_URL}
              eventLabel={RSVP_EVENT_LABEL}
            />
          </div>
        )}
      </div>
    );
  }

  if (event.ticketUrl) {
    return (
      <div className="border border-pink bg-cream/60 p-10 text-center md:p-14">
        <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
          Tickets for this concert are sold by our partner.
        </p>
        <a
          href={event.ticketUrl}
          target="_blank"
          rel="noopener"
          className="smallcaps mt-6 inline-flex min-h-12 items-center border border-maroon bg-maroon px-6 py-3 text-cream transition hover:bg-maroon-deep"
        >
          Buy tickets
        </a>
      </div>
    );
  }

  return (
    <div className="border border-pink bg-cream/60 p-10 text-center md:p-14">
      <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
        Booking for this concert opens soon.
      </p>
      <p className="mt-3 text-ink/80">
        Sign up for the newsletter to hear the moment tickets go on sale.
      </p>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border border-pink bg-cream/70 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-brand-purple/10 text-brand-purple">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <dt className="smallcaps text-muted">{label}</dt>
        <dd className="mt-1 leading-snug text-ink">{children}</dd>
      </div>
    </div>
  );
}
