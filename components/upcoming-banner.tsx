import { UPCOMING_BANNER_MESSAGE } from "@/lib/upcoming";
import { cn } from "@/lib/utils";

/**
 * Stands in for the upcoming-concert posters between announcements.
 * Rendered wherever UPCOMING_BANNER_ONLY is on — see lib/upcoming.ts.
 *
 * Deliberately just the message: no subline, link or ornament.
 */
export function UpcomingBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border border-pink bg-cream/60 px-6 py-16 text-center md:px-10 md:py-24",
        className
      )}
    >
      <p className="mx-auto max-w-2xl font-display text-3xl italic leading-snug text-brand-purple md:text-4xl">
        {UPCOMING_BANNER_MESSAGE}
      </p>
    </div>
  );
}
