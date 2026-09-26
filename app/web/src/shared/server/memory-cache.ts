/*
 * Keeps the result of a slow lookup (like a database query) in server memory
 * for a short time, so busy pages don't repeat it on every visit.
 *
 *   const getThing = memoryCache(30_000, loadThing, fallback);
 *   const thing = await getThing();
 *
 * - Many visitors at once share one lookup.
 * - If the lookup fails, the last good result is used (or the fallback if
 *   there has never been one), and the next visit tries again.
 */
export function memoryCache<T>(
  ttlMs: number,
  load: () => Promise<T>,
  fallback: T,
): () => Promise<T> {
  let cached: { at: number; value: T } | null = null;
  let inFlight: Promise<T> | null = null;

  return async function getCached() {
    if (cached && Date.now() - cached.at < ttlMs) {
      return cached.value;
    }

    if (!inFlight) {
      inFlight = load()
        .then((value) => {
          cached = { at: Date.now(), value };
          return value;
        })
        .finally(() => {
          inFlight = null;
        });
    }

    try {
      return await inFlight;
    } catch {
      return cached ? cached.value : fallback;
    }
  };
}
