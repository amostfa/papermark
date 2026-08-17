import { type Locker, MemoryLocker } from "@tus/server";
import { Redis } from "@upstash/redis";

import { RedisLocker } from "./tus-redis-locker";

/**
 * Use a distributed lock when the optional Upstash credentials are configured.
 *
 * The TUS server already uses an in-memory locker by default. Creating an
 * Upstash client with empty credentials overrides that safe default and makes
 * every upload fail while trying to call the invalid `/pipeline` URL. Keep the
 * distributed locker for multi-instance deployments, but retain a working
 * fallback for self-hosted installations that do not provision Redis.
 */
export function createTusLocker(): Locker {
  const url = process.env.UPSTASH_REDIS_REST_LOCKER_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN?.trim();

  if (url && token) {
    return new RedisLocker({
      redisClient: new Redis({ url, token }),
    });
  }

  if (url || token) {
    console.warn(
      "[tus] Both UPSTASH_REDIS_REST_LOCKER_URL and " +
        "UPSTASH_REDIS_REST_LOCKER_TOKEN are required; using the " +
        "in-memory locker.",
    );
  }

  return new MemoryLocker();
}
