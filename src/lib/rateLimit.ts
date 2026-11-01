const MAX_KEYS = 10_000;
const FULL_SWEEP_EVERY_MS = 1_000;
const OVERFLOW_BUCKETS = 64;
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

// FNV-1a: spreads clients across overflow buckets so one flooder only hurts its own slice.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export const trackedKeys = () => hits.size;

function sweep(now: number) {
  lastSweep = now;
  for (const [key, hit] of hits) if (hit.resetAt <= now) hits.delete(key);
}

/** True when the request is allowed. */
// ponytail: per-instance map, swap for Upstash/Vercel KV if abuse appears or limits must hold across instances.
export function rateLimit(ip: string, bucket: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  if (now - lastSweep >= windowMs || now < lastSweep) sweep(now);

  let key = `${bucket}:${ip}`;
  if (!hits.has(key) && hits.size >= MAX_KEYS) {
    // Full: drop expired entries at most once a second. Live counters are never evicted, so a flood
    // cannot reset anyone's limit; if still full, new keys share 64 hashed overflow buckets.
    if (now - lastSweep >= FULL_SWEEP_EVERY_MS) sweep(now);
    if (hits.size >= MAX_KEYS) key = `overflow:${bucket}:${hash(ip) % OVERFLOW_BUCKETS}`;
  }
  const hit = hits.get(key);
  if (!hit || hit.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  hit.count++;
  return hit.count <= max;
}
