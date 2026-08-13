import assert from "node:assert/strict";

import {
  consumeAuthRateLimit,
  deleteLoginCode,
  fetchAndDeleteLoginCodeData,
  storeLoginCode,
} from "@/lib/auth/login-code";
import prisma from "@/lib/prisma";

function assertDisposableDatabase(): void {
  const databaseUrl = process.env.POSTGRES_PRISMA_URL;

  if (!databaseUrl) {
    throw new Error("POSTGRES_PRISMA_URL is required");
  }

  const parsed = new URL(databaseUrl);
  const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

  if (
    !localHostnames.has(parsed.hostname) ||
    parsed.pathname !== "/papermark"
  ) {
    throw new Error(
      "The authentication database smoke test only runs against the local papermark database",
    );
  }
}

async function main(): Promise<void> {
  assertDisposableDatabase();

  const nonce = `${Date.now()}-${process.pid}`;
  const email = `auth-smoke-${nonce}@example.invalid`;
  const callbackUrl = `http://localhost:3017/api/auth/callback/email?test=${nonce}`;

  try {
    await storeLoginCode({ email, code: "AAAAAAAAAA", callbackUrl });
    await storeLoginCode({ email, code: "BBBBBBBBBB", callbackUrl });

    const firstCode = await fetchAndDeleteLoginCodeData(email, "AAAAAAAAAA");
    assert.equal(firstCode?.callbackUrl, callbackUrl);

    const consumed = await fetchAndDeleteLoginCodeData(email, "BBBBBBBBBB");
    assert.equal(consumed?.callbackUrl, callbackUrl);
    assert.equal(
      await fetchAndDeleteLoginCodeData(email, "BBBBBBBBBB"),
      null,
      "a login code must only be usable once",
    );

    await storeLoginCode({ email, code: "DDDDDDDDDD", callbackUrl });
    await deleteLoginCode(email, "EEEEEEEEEE");
    assert.equal(
      (await fetchAndDeleteLoginCodeData(email, "DDDDDDDDDD"))?.callbackUrl,
      callbackUrl,
      "cleaning up one failed delivery must not remove another request's code",
    );

    await storeLoginCode({ email, code: "CCCCCCCCCC", callbackUrl });
    await prisma.loginCode.update({
      where: { email_code: { email, code: "CCCCCCCCCC" } },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(
      await fetchAndDeleteLoginCodeData(email, "CCCCCCCCCC"),
      null,
      "expired codes must be rejected",
    );

    const rateLimitInput = {
      scope: `auth-smoke-${nonce}`,
      subject: email,
      limit: 2,
      windowMs: 60_000,
    };
    assert.equal((await consumeAuthRateLimit(rateLimitInput)).success, true);
    assert.equal((await consumeAuthRateLimit(rateLimitInput)).success, true);
    assert.equal((await consumeAuthRateLimit(rateLimitInput)).success, false);

    const rateLimitRows = await prisma.authRateLimit.findMany({
      where: { key: { startsWith: `auth-smoke-${nonce}:` } },
    });
    assert.equal(rateLimitRows.length, 1);
    assert.equal(
      rateLimitRows[0].key.includes(email),
      false,
      "rate-limit keys must not expose email addresses",
    );

    console.log("Database-backed login codes and rate limits passed.");
  } finally {
    await prisma.loginCode.deleteMany({ where: { email } });
    await prisma.authRateLimit.deleteMany({
      where: { key: { startsWith: `auth-smoke-${nonce}:` } },
    });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
