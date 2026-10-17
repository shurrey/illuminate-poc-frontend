import { sessionCheck } from "./session";

export interface Pending<T> { id: number; apply: (state: T) => T }
/** The last state the server confirmed, plus changes sent but not yet answered. */
export interface Optimistic<T> { base: T; pending: Pending<T>[] }

export const settled = <T>(base: T): Optimistic<T> => ({ base, pending: [] });
export const shown = <T>(o: Optimistic<T>): T => o.pending.reduce((state, p) => p.apply(state), o.base);
export const begin = <T>(o: Optimistic<T>, p: Pending<T>): Optimistic<T> => ({ ...o, pending: [...o.pending, p] });
export const confirm = <T>(o: Optimistic<T>, id: number, base: T): Optimistic<T> =>
  ({ base, pending: o.pending.filter((p) => p.id !== id) });
export const discard = <T>(o: Optimistic<T>, id: number): Optimistic<T> =>
  ({ ...o, pending: o.pending.filter((p) => p.id !== id) });

interface LayoutCard { id: string; enabled?: boolean }

export const toggled = <C extends LayoutCard>(cards: C[], id: string): C[] =>
  cards.map((c) => (c.id === id ? { ...c, enabled: c.enabled === false } : c));

export function moved<C extends LayoutCard>(cards: C[], id: string, direction: "up" | "down"): C[] {
  const idx = cards.findIndex((c) => c.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= cards.length) return cards;
  const next = [...cards];
  [next[idx], next[swap]] = [next[swap], next[idx]];
  return next;
}

/** The layout to save: cards in their shown order, plus the built-ins the server reported as hidden. */
export const layoutOf = (cards: LayoutCard[], hidden: string[]) => ({
  order: cards.map((c) => c.id),
  disabled: cards.filter((c) => c.enabled === false).map((c) => c.id),
  hidden,
});

interface PrefLists { favorites: string[]; recentReports: string[]; readNotifications: string[] }

export const toggleFavorite = <P extends PrefLists>(p: P, id: string): P =>
  ({ ...p, favorites: p.favorites.includes(id) ? p.favorites.filter((f) => f !== id) : [...p.favorites, id] });
export const addRecent = <P extends PrefLists>(p: P, id: string): P =>
  ({ ...p, recentReports: [id, ...p.recentReports.filter((r) => r !== id)].slice(0, 5) });
export const markRead = <P extends PrefLists>(p: P, ids: string[]): P =>
  ({ ...p, readNotifications: [...new Set([...p.readNotifications, ...ids])] });

interface Status { loading: boolean; loaded: boolean; error: string | null }
export interface StoreSnapshot<T> extends Status { value: T }

export interface Change<T, R> {
  apply: (state: T) => T;
  /** next is apply(base); base is the last confirmed state, including its version. */
  send: (next: T, base: T) => Promise<R>;
  /** The confirmed state once the server has answered. */
  merge: (base: T, result: R) => T;
}

const messageOf = (e: unknown) => (e instanceof Error && e.message ? e.message : "Something went wrong");

/**
 * Server-backed state with optimistic changes. Loads and changes run one at a time, so each request is built
 * from the state the previous one confirmed. Results that arrive after the session ended are dropped.
 */
export class ProfileStore<T> {
  private o: Optimistic<T>;
  private status: Status = { loading: true, loaded: false, error: null };
  private snap: StoreSnapshot<T>;
  private queue: Promise<unknown> = Promise.resolve();
  private seq = 0;
  private listeners = new Set<() => void>();

  constructor(private initial: T, private fetch: () => Promise<T>, private isConflict: (e: unknown) => boolean) {
    this.o = settled(initial);
    this.snap = this.build();
  }

  snapshot = (): StoreSnapshot<T> => this.snap;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  load(): Promise<boolean> {
    const live = sessionCheck();
    return this.enqueue(async () => {
      if (!live()) return false;
      this.update({ loading: true });
      try {
        const value = await this.fetch();
        if (!live()) return false;
        this.o = { ...this.o, base: value };
        this.update({ loading: false, loaded: true, error: null });
        return true;
      } catch (e) {
        if (!live()) return false;
        this.update({ loading: false, error: messageOf(e) });
        return false;
      }
    });
  }

  /** Applies change at once; resolves true once the server confirms it, false after rolling it back. */
  mutate<R>(change: Change<T, R>): Promise<boolean> {
    const live = sessionCheck();
    const id = ++this.seq;
    this.o = begin(this.o, { id, apply: change.apply });
    this.update({});
    return this.enqueue(async () => {
      if (!live()) return false;
      for (let attempt = 0; ; attempt++) {
        try {
          const base = this.o.base;
          const result = await change.send(change.apply(base), base);
          if (!live()) return false;
          this.o = confirm(this.o, id, change.merge(this.o.base, result));
          this.update({});
          return true;
        } catch (e) {
          if (!live()) return false;
          if (attempt === 0 && this.isConflict(e)) {
            try {
              const fresh = await this.fetch();
              if (!live()) return false;
              this.o = { ...this.o, base: fresh };
              continue;
            } catch (reloadError) {
              if (!live()) return false;
              return this.fail(id, reloadError);
            }
          }
          return this.fail(id, e);
        }
      }
    });
  }

  clearError(): void {
    this.update({ error: null });
  }

  reset = (): void => {
    this.o = settled(this.initial);
    this.queue = Promise.resolve();
    this.update({ loading: true, loaded: false, error: null });
  };

  private fail(id: number, e: unknown): false {
    this.o = discard(this.o, id);
    this.update({ error: messageOf(e) });
    return false;
  }

  private enqueue<R>(run: () => Promise<R>): Promise<R> {
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private build(): StoreSnapshot<T> {
    return { value: shown(this.o), ...this.status };
  }

  private update(status: Partial<Status>): void {
    this.status = { ...this.status, ...status };
    this.snap = this.build();
    this.listeners.forEach((l) => l());
  }
}
