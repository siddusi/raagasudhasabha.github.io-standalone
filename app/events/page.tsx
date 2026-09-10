import type { Metadata } from "next";
import { EventCard } from "@/components/event-card";
import { EventsList } from "@/components/events-list";
import { PageHeader, EmptyState } from "@/components/page-header";
import { UpcomingBanner } from "@/components/upcoming-banner";
import { getUpcoming, getPast, isTicketed } from "@/lib/events";
import { SUPPORT_EMAIL } from "@/lib/commerce-config";
import { UPCOMING_BANNER_ONLY } from "@/lib/upcoming";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming and past concerts presented by Raaga Sudha Sabha — featuring world-class Indian Classical artists.",
};

export default function EventsPage() {
  const upcoming = getUpcoming();
  const past = getPast();
  const onSale = upcoming.filter(isTicketed).length;

  return (
    <>
      <PageHeader
        kicker="Concerts & Festivals"
        title="Events"
        sub="Concerts, festivals and workshops featuring world-class Indian Classical artists."
      />

      {/* UPCOMING */}
      <section className="bg-cream-deep/30">
        <div className="container-edge py-14 md:py-20">
          <div className="flex items-baseline justify-between gap-6">
            <h2 className="font-display text-display-md text-maroon">
              Upcoming
            </h2>
            {/*
              Counts only concerts whose tickets are actually live — an
              announced concert with ticketing still to come must not be
              billed as "on sale".
            */}
            {!UPCOMING_BANNER_ONLY && onSale > 0 && (
              <span className="smallcaps text-muted">
                {onSale} {onSale === 1 ? "concert" : "concerts"} on sale
              </span>
            )}
          </div>

          <div className="mt-8">
            {UPCOMING_BANNER_ONLY ? (
              <UpcomingBanner />
            ) : upcoming.length > 0 ? (
              // Every concert gets the same full-width row rather than one
              // promoted card and the rest as narrow offcuts.
              <div className="space-y-6">
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} variant="featured" />
                ))}
              </div>
            ) : (
              <EmptyState message="The next concert is being announced. Sign up below for the newsletter to be the first to know." />
            )}
          </div>

          <p className="mt-8 text-sm text-muted">
            For partnership or press enquiries, write to{" "}
            <a className="link-purple" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </div>
      </section>

      {/* PAST */}
      <section className="bg-cream">
        <div className="container-edge py-14 md:py-20">
          <div className="flex items-baseline justify-between gap-6">
            <h2 className="font-display text-display-md text-maroon">Past</h2>
            {past.length > 0 && (
              <span className="smallcaps text-muted">archive</span>
            )}
          </div>
          <div className="mt-8">
            {past.length > 0 ? (
              <EventsList events={past} />
            ) : (
              <EmptyState message="Past concerts will be archived here as the season fills out." />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
