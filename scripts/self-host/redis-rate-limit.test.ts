import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryRateLimiter } from "../../lib/redis.ts";

test("the Redis-free limiter enforces a local sliding window", async () => {
  const limiter = createInMemoryRateLimiter(2, "1 m");
  const key = `viewer-test-${Date.now()}-${Math.random()}`;

  const first = await limiter.limit(key);
  const second = await limiter.limit(key);
  const third = await limiter.limit(key);

  assert.equal(first.success, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.success, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.success, false);
  assert.equal(third.remaining, 0);
  assert.equal(third.limit, 2);
  assert.ok(third.reset > Date.now());
});
