export type RateLimitDecision = { allowed: true } | { allowed: false };

export type RateLimiter = (key: string, limit: number, windowMs: number) => RateLimitDecision;

export function createRateLimiter(now: () => number = Date.now): RateLimiter {
  const buckets = new Map<string, number[]>();

  return (key, limit, windowMs) => {
    const time = now();
    const cutoff = time - windowMs;
    const recent = (buckets.get(key) ?? []).filter((stamp) => stamp > cutoff);
    if (recent.length >= limit) {
      buckets.set(key, recent);
      return { allowed: false };
    }
    recent.push(time);
    buckets.set(key, recent);
    if (buckets.size > 2000) {
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined && oldest !== key) buckets.delete(oldest);
    }
    return { allowed: true };
  };
}
