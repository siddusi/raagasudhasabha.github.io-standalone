"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getEventById,
  formatMoney,
  type Event,
  type TicketTier,
} from "@/lib/events";

const STORAGE_KEY = "rss.cart.v1";

/**
 * What we persist is deliberately minimal: an event, a tier and a quantity.
 * No prices are stored, so a stale cart in localStorage can never resurrect
 * an old price — lines are re-resolved against the catalog on every read,
 * and re-priced again server-side at checkout.
 */
export type CartItem = {
  eventId: string;
  tierId: string;
  qty: number;
};

/** A cart item joined back to its event and tier. */
export type CartLine = CartItem & {
  event: Event;
  tier: TicketTier;
  subtotalCents: number;
};

type CartContextValue = {
  items: CartItem[];
  lines: CartLine[];
  /** Total across all lines, in cents. */
  totalCents: number;
  /** Total number of tickets (not lines). */
  count: number;
  /** True once localStorage has been read — guards against SSR mismatch. */
  ready: boolean;
  setQty: (eventId: string, tierId: string, qty: number) => void;
  addQty: (eventId: string, tierId: string, delta: number) => void;
  getQty: (eventId: string, tierId: string) => number;
  removeLine: (eventId: string, tierId: string) => void;
  removeEvent: (eventId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        !!i &&
        typeof i.eventId === "string" &&
        typeof i.tierId === "string" &&
        Number.isFinite(i.qty) &&
        i.qty > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Read once on mount. Rendering an empty cart on the server and filling it
  // in on the client keeps the static export hydration-safe.
  useEffect(() => {
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* Private mode / quota — the cart just won't survive a reload. */
    }
  }, [items, ready]);

  // Keep two open tabs in agreement.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /**
   * Single mutation path for quantities.
   *
   * Edits the matching item **in place**. An earlier version filtered the
   * item out and pushed the new value onto the end, which silently reordered
   * the cart: because every tier of one event shares an event date, the
   * date-only sort below preserved that new order and the edited row jumped
   * to the bottom of its group — making it look like the wrong ticket type
   * had changed.
   */
  const update = useCallback(
    (eventId: string, tierId: string, resolve: (current: number) => number) => {
      setItems((prev) => {
        const index = prev.findIndex(
          (i) => i.eventId === eventId && i.tierId === tierId
        );
        const current = index >= 0 ? prev[index].qty : 0;

        const raw = resolve(current);
        // A cleared number input yields NaN — hold the current value rather
        // than dropping the row out from under someone mid-edit.
        if (!Number.isFinite(raw)) return prev;

        const tier = getEventById(eventId)?.tiers.find((t) => t.id === tierId);
        const ceiling = tier?.maxPerOrder ?? 10;
        const next = Math.max(0, Math.min(Math.floor(raw), ceiling));

        if (next === current) return prev;
        if (next === 0) return prev.filter((_, i) => i !== index);

        if (index >= 0) {
          const copy = prev.slice();
          copy[index] = { ...copy[index], qty: next };
          return copy;
        }
        return [...prev, { eventId, tierId, qty: next }];
      });
    },
    []
  );

  const setQty = useCallback(
    (eventId: string, tierId: string, qty: number) => {
      update(eventId, tierId, () => qty);
    },
    [update]
  );

  const getQty = useCallback(
    (eventId: string, tierId: string) =>
      items.find((i) => i.eventId === eventId && i.tierId === tierId)?.qty ?? 0,
    [items]
  );

  const addQty = useCallback(
    (eventId: string, tierId: string, delta: number) => {
      update(eventId, tierId, (current) => current + delta);
    },
    [update]
  );

  const removeLine = useCallback((eventId: string, tierId: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.eventId === eventId && i.tierId === tierId))
    );
  }, []);

  const removeEvent = useCallback((eventId: string) => {
    setItems((prev) => prev.filter((i) => i.eventId !== eventId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // Resolve against the catalog, dropping anything that no longer exists
  // (an event was removed, a tier renamed) rather than rendering a broken row.
  const lines = useMemo<CartLine[]>(() => {
    const out: CartLine[] = [];
    for (const item of items) {
      const event = getEventById(item.eventId);
      if (!event) continue;
      const tier = event.tiers.find((t) => t.id === item.tierId);
      if (!tier) continue;
      out.push({
        ...item,
        event,
        tier,
        subtotalCents: tier.priceCents * item.qty,
      });
    }
    // Order by concert date, then by the tier's position in the catalog, so
    // rows keep a fixed position no matter what order they were added or
    // edited in. Without the tiebreaker every tier of one event compares
    // equal and the display order follows insertion order instead.
    return out.sort((a, b) => {
      const byDate = +new Date(a.event.date) - +new Date(b.event.date);
      if (byDate !== 0) return byDate;
      return (
        a.event.tiers.findIndex((t) => t.id === a.tierId) -
        b.event.tiers.findIndex((t) => t.id === b.tierId)
      );
    });
  }, [items]);

  const totalCents = useMemo(
    () => lines.reduce((sum, l) => sum + l.subtotalCents, 0),
    [lines]
  );

  const count = useMemo(
    () => lines.reduce((sum, l) => sum + l.qty, 0),
    [lines]
  );

  const value = useMemo(
    () => ({
      items,
      lines,
      totalCents,
      count,
      ready,
      setQty,
      addQty,
      getQty,
      removeLine,
      removeEvent,
      clear,
    }),
    [
      items,
      lines,
      totalCents,
      count,
      ready,
      setQty,
      addQty,
      getQty,
      removeLine,
      removeEvent,
      clear,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export { formatMoney };
