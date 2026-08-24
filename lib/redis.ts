import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

export const isRedisConfigured = Boolean(redisUrl && redisToken);

function createUnavailableRedisClient(): Redis {
  return new Proxy({} as Redis, {
    get: (_target, property) => {
      if (property === "then") return undefined;

      return () => {
        throw new Error(
          "This feature requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
        );
      };
    },
  });
}

export const redis: Redis = isRedisConfigured
  ? new Redis({ url: redisUrl!, token: redisToken! })
  : createUnavailableRedisClient();

type RateLimitDuration =
  | `${number} ms`
  | `${number} s`
  | `${number} m`
  | `${number} h`
  | `${number} d`;

type InMemoryRateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<void>;
};

const localRateLimitWindows = new Map<string, number[]>();

function durationToMilliseconds(duration: RateLimitDuration): number {
  const match = /^(\d+(?:\.\d+)?) (ms|s|m|h|d)$/.exec(duration);
  if (!match) return 10_000;

  const value = Number(match[1]);
  const multipliers = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  } as const;

  return value * multipliers[match[2] as keyof typeof multipliers];
}

/**
 * Best-effort limiter for self-hosted deployments without Upstash. State is
 * scoped to a warm application instance, so configure Upstash when limits
 * must be coordinated across multiple regions or instances.
 */
export function createInMemoryRateLimiter(
  requests: number,
  duration: RateLimitDuration,
) {
  const limit = Math.max(1, Math.floor(requests));
  const windowMs = durationToMilliseconds(duration);

  return {
    async limit(identifier: string): Promise<InMemoryRateLimitResult> {
      const now = Date.now();
      const cutoff = now - windowMs;
      const key = `${limit}:${windowMs}:${identifier}`;
      const timestamps = (localRateLimitWindows.get(key) ?? []).filter(
        (timestamp) => timestamp > cutoff,
      );
      const success = timestamps.length < limit;

      if (success) timestamps.push(now);

      if (timestamps.length > 0) {
        localRateLimitWindows.set(key, timestamps);
      } else {
        localRateLimitWindows.delete(key);
      }

      return {
        success,
        limit,
        remaining: Math.max(0, limit - timestamps.length),
        reset: (timestamps[0] ?? now) + windowMs,
        pending: Promise.resolve(),
      };
    },
  };
}

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds: RateLimitDuration = "10 s",
) => {
  if (!isRedisConfigured) {
    return createInMemoryRateLimiter(requests, seconds);
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "papermark",
  });
};
