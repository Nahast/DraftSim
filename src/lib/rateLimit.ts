const MAX_KEYS = 10_000;
let lastSweep = 0;
const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * Client IP from the platform's header, else the rightmost x-forwarded-for entry (the one our own proxy appended).
 * The leftmost entry is client-supplied and spoofable, so it is never used.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? "local";
}

export const trackedKeys = () => hits.size;

function sweep(now: number) {
  lastSweep = now;
  for (const [key, hit] of hits) if (hit.resetAt <= now) hits.delete(key);
  // Still over the cap after dropping expired entries: evict oldest first (Map keeps insertion order).
  for (const key of hits.keys()) {
    if (hits.size < MAX_KEYS) break;
    hits.delete(key);
  }
}

/** True when the request is allowed. */
// ponytail: per-instance map, swap for Upstash/Vercel KV if abuse appears or limits must hold across instances.
export function rateLimit(ip: string, bucket: string, max: number, windowMs = 60_000): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  if (hits.size >= MAX_KEYS || now - lastSweep >= windowMs || now < lastSweep) sweep(now);
  const hit = hits.get(key);
  if (!hit || hit.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  hit.count++;
  return hit.count <= max;
}
