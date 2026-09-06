import data from "@/content/events.json";

export type EventStatus = "upcoming" | "past";

/**
 * How the event handles admission.
 *
 *  "open"   — tickets are on sale; the tier picker and cart are live.
 *  "closed" — ticketing is finished (sold out, or the event has passed).
 *  "free"   — no charge; the RSVP flow in lib/upcoming.ts is used instead.
 *  "none"   — nothing to book (announcement only).
 */
export type Ticketing = "open" | "closed" | "free" | "none";

export type TicketTier = {
  id: string;
  name: string;
  description: string | null;
  /** Always integer cents. Never store money as a float. */
  priceCents: number;
  /** Total seats for this tier. null means uncapped. */
  capacity: number | null;
  maxPerOrder: number;
};

export type Event = {
  id: string;
  title: string;
  artists: string[];
  date: string;
  endDate: string | null;
  venue: string;
  address: string | null;
  city: string;
  description: string;
  image: string | null;
  ticketUrl: string | null;
  status: EventStatus;
  ticketing: Ticketing;
  tiers: TicketTier[];
};

const all: Event[] = data as Event[];

export function getAllEvents(): Event[] {
  return all;
}

export function getUpcoming(): Event[] {
  return all
    .filter((e) => e.status === "upcoming")
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export function getPast(): Event[] {
  return all
    .filter((e) => e.status === "past")
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getFeaturedUpcoming(): Event | null {
  return getUpcoming()[0] ?? null;
}

export function getEventById(id: string): Event | null {
  return all.find((e) => e.id === id) ?? null;
}

/** True when the tier picker and cart should be shown for this event. */
export function isTicketed(e: Event): boolean {
  return e.ticketing === "open" && e.tiers.length > 0;
}

/** Lowest tier price, for the "Price starts from" line on cards. */
export function lowestPriceCents(e: Event): number | null {
  if (e.tiers.length === 0) return null;
  return Math.min(...e.tiers.map((t) => t.priceCents));
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatEventDate(iso: string) {
  const d = new Date(iso);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.toLocaleDateString("en-US", { day: "numeric" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return {
    month,
    day,
    year,
    time,
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

/** "5:00 PM – 8:00 PM" (or just the start time when there is no end). */
export function formatEventTime(e: Event): string {
  const t = (d: Date) =>
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const start = t(new Date(e.date));
  return e.endDate ? `${start} – ${t(new Date(e.endDate))}` : start;
}

/** "October 10, 2026" */
export function formatEventDay(e: Event): string {
  return new Date(e.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "October 10, 2026 · 5:00 PM – 8:00 PM" */
export function formatEventRange(e: Event): string {
  return `${formatEventDay(e)} · ${formatEventTime(e)}`;
}
