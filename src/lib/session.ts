/** Resets for state that belongs to one signed-in session; authService.logout() ends the session. */
const resets = new Set<() => void>();
let epoch = 0;

/** Register a reset to run when the session ends; returns a function that unregisters it. */
export function onSessionEnd(reset: () => void): () => void {
  resets.add(reset);
  return () => { resets.delete(reset); };
}

/** Run every reset; one that throws does not stop the rest. */
export function endSession(): void {
  epoch += 1;
  resets.forEach((reset) => {
    try {
      reset();
    } catch (err) {
      console.error("Session reset failed", err);
    }
  });
}

/** A check for async work: true while the session it was taken in is still the current one. */
export function sessionCheck(): () => boolean {
  const started = epoch;
  return () => epoch === started;
}
