const entries = new Map();
const inFlight = new Map();
let cacheGeneration = 0;

export const cachedGet = (key, request, ttlMs = 15000) => {
  const cached = entries.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
  if (inFlight.has(key)) return inFlight.get(key);

  const requestGeneration = cacheGeneration;
  const promise = request()
    .then((value) => {
      if (requestGeneration === cacheGeneration) {
        entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    })
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
};

export const invalidateCache = (...prefixes) => {
  for (const key of entries.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) entries.delete(key);
  }
};

export const clearRequestCache = () => {
  cacheGeneration += 1;
  entries.clear();
  inFlight.clear();
};
