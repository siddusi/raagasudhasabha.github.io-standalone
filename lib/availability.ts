"use client";

import { useEffect, useState } from "react";
import { COMMERCE_API_URL, SHOW_REMAINING } from "@/lib/commerce-config";

export type Availability = {
  /** tierId → seats still purchasable. */
  remaining: Record<string, number>;
  /** "loading" until the first response settles. */
  state: "loading" | "ready" | "unavailable";
};

/**
 * Live remaining-seat counts for one event.
 *
 * Deliberately fail-soft: if the Worker is unreachable we return
 * "unavailable" and the UI simply omits the counts rather than blocking a
 * sale. The authoritative check happens server-side at capture time anyway,
 * so a stale or missing count here can never oversell the room.
 */
export function useAvailability(eventId: string): Availability {
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [state, setState] = useState<Availability["state"]>(
    SHOW_REMAINING ? "loading" : "unavailable"
  );

  useEffect(() => {
    if (!SHOW_REMAINING) return;

    const controller = new AbortController();
    // Don't leave the UI spinning forever on a cold Worker.
    const timer = setTimeout(() => controller.abort(), 8000);

    fetch(
      `${COMMERCE_API_URL}/availability?event=${encodeURIComponent(eventId)}`,
      { signal: controller.signal }
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (json && typeof json.remaining === "object" && json.remaining) {
          setRemaining(json.remaining);
          setState("ready");
        } else {
          setState("unavailable");
        }
      })
      .catch(() => setState("unavailable"))
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [eventId]);

  return { remaining, state };
}
