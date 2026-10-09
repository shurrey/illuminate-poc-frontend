/** Report results by user and key; a failed result is evicted so Retry runs it again. */
export function createResultCache() {
  const entries = new Map<string, Promise<unknown>>();
  const id = (user: string, key: string) => `${user}\u0000${key}`;
  return {
    get<T>(user: string, key: string): Promise<T> | undefined {
      return entries.get(id(user, key)) as Promise<T> | undefined;
    },
    set<T>(user: string, key: string, value: Promise<T>): void {
      entries.set(id(user, key), value);
      value.catch(() => { if (entries.get(id(user, key)) === value) entries.delete(id(user, key)); });
    },
    clear(): void {
      entries.clear();
    },
  };
}

/** The page-wide cache; cleared whenever a session ends. */
export const reportResults = createResultCache();
