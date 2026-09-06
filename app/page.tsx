import Link from "next/link";
import { Music, Archive, Sparkles } from "lucide-react";
import { PillarCard } from "@/components/pillar-card";
import { EventCard } from "@/components/event-card";
import { Ornament } from "@/components/ornament";
import { DonateButton } from "@/components/donate-button";
import { UpcomingBanner } from "@/components/upcoming-banner";
import { getUpcoming } from "@/lib/events";
import { UPCOMING_BANNER_ONLY } from "@/lib/upcoming";

export default function HomePage() {
  const upcoming = getUpcoming();

  return (
    <>
      {/* UPCOMING EVENTS */}
      <section className="border-b border-pink bg-cream-deep/30">
        <div className="container-edge py-16 md:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">On Our Stage</p>
              <h2 className="mt-2 font-display text-display-md text-maroon">
                Upcoming events
              </h2>
            </div>
            <Link
              href="/events"
              className="smallcaps text-maroon underline-offset-4 hover:underline"
            >
              See all events →
            </Link>
          </div>

          {UPCOMING_BANNER_ONLY ? (
            <UpcomingBanner />
          ) : upcoming.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {upcoming.slice(0, 3).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          ) : (
            <div className="border border-pink bg-cream/60 p-10 text-center">
              <p className="font-display text-2xl italic text-brand-purple md:text-3xl">
                The next concert is being announced.
              </p>
              <p className="mt-3 text-ink/80">
                Sign up below for the newsletter to be the first to know.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-pink bg-cream">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 28%, #6B1F2A 0, transparent 40%), radial-gradient(circle at 82% 72%, #7A007F 0, transparent 45%)",
          }}
        />
        <div className="container-edge relative grid gap-10 py-16 md:py-24 lg:grid-cols-12 lg:py-32">
          <div className="lg:col-span-9 lg:col-start-2">
            <p className="kicker">A Cultural Arts Initiative</p>

            <Ornament className="mt-6 h-3 w-32 text-brand-purple/70" />

            <h1 className="mt-6 font-display italic text-[2rem] leading-[1.02] tracking-tight text-brand-purple sm:text-display-lg md:text-display-xl">
              Raaga Sudha Sabha
            </h1>

            <p className="mt-8 max-w-2xl font-display text-xl italic leading-snug text-ink/85 md:text-2xl">
              Preserving and promoting Indian classical music — for the rasika,
              for the artist, for the generations to come.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/events"
                className="smallcaps inline-flex min-h-12 items-center justify-center border border-maroon bg-maroon px-6 py-3 text-cream transition hover:bg-maroon-deep"
              >
                Upcoming Concerts
              </Link>
              <DonateButton variant="outline">Support Our Mission</DonateButton>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="border-b border-pink bg-cream-deep/40">
        <div className="container-edge py-16 md:py-24">
          <div className="mx-auto max-w-readable">
            <p className="kicker text-center">Our Mission</p>
            <Ornament className="mx-auto mt-4 h-3 w-24 text-brand-purple/70" />
            <p className="mt-8 text-center font-display text-2xl leading-relaxed text-ink md:text-3xl md:leading-[1.4]">
              Raaga Sudha Sabha is a cultural arts organization dedicated to
              the preservation and global promotion of Indian classical music.
              We aim to make this art form accessible to all enthusiasts
              <span className="italic"> (rasikas)</span> and provide a robust
              platform for the younger generation to learn, perform, and engage
              with the community for cultural enrichment. We uphold the art
              form&rsquo;s high standards by organizing concerts and workshops
              featuring world-class professional artists.
            </p>
          </div>
        </div>
      </section>

      {/* HOW WE WORK — three pillars */}
      <section className="bg-cream">
        <div className="container-edge py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="kicker">Three Pillars</p>
            <h2 className="mt-3 font-display text-display-md text-maroon">
              How we work
            </h2>
            <Ornament className="mx-auto mt-5 h-3 w-24 text-brand-purple/70" />
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            <PillarCard
              icon={Music}
              title="Artistic Presentation"
              body="Host Indian classical music festivals, featuring legendary masters and emerging artists, to celebrate and advance the tradition."
            />
            <PillarCard
              icon={Archive}
              title="Cultural Preservation"
              body="Maintain a comprehensive archive of music, documentaries, and interviews to ensure the longevity and historical documentation of Indian classical traditions."
            />
            <PillarCard
              icon={Sparkles}
              title="Talent Nurturing"
              body="Foster the next generation of musicians through professional development opportunities."
            />
          </div>
        </div>
      </section>

      {/* ENDARO QUOTE STRIP */}
      <section className="bg-cream">
        <div className="container-edge py-16 text-center md:py-20">
          <Ornament className="mx-auto h-3 w-32 text-brand-purple/70" />
          <blockquote className="mx-auto mt-6 max-w-3xl">
            <p className="font-display text-2xl italic leading-snug text-brand-purple md:text-4xl md:leading-tight">
              &ldquo;Endaro Mahanubhavulu, andariki vandanamulu.&rdquo;
            </p>
            <footer className="smallcaps mt-5 text-muted">— Sri Tyagaraja</footer>
          </blockquote>
        </div>
      </section>
    </>
  );
}
