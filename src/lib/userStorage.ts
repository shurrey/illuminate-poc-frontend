/** The localStorage key for one user's copy of a store, or null when no one is signed in. */
export function userStorageKey(base: string, userId: string | null): string | null {
  return userId ? `${base}:${userId}` : null;
}
