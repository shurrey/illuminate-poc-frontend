/** A queue running at most `limit` async jobs at once, in submission order. */
export function createPool(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async function run<T>(job: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await job();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}
