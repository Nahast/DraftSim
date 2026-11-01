const hits = new Map<string, { count: number; resetAt: number }>();

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** True when the request is allowed. */
// ponytail: per-instance map, swap for Upstash/Vercel KV if abuse appears.
export function rateLimit(ip: string, bucket: string, max: number, windowMs = 60_000): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hit = hits.get(key);
  if (!hit || hit.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  hit.count++;
  return hit.count <= max;
}
