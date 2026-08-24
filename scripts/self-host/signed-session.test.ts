import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  createSignedSessionToken,
  parseSignedSessionToken,
} from "../../lib/auth/signed-session.ts";

const previousSecret = process.env.NEXTAUTH_SECRET;

before(() => {
  process.env.NEXTAUTH_SECRET = "self-host-test-secret-with-sufficient-entropy";
});

after(() => {
  if (previousSecret === undefined) {
    delete process.env.NEXTAUTH_SECRET;
  } else {
    process.env.NEXTAUTH_SECRET = previousSecret;
  }
});

test("signed session payloads round-trip for the expected purpose", () => {
  const payload = { linkId: "link_123", expiresAt: Date.now() + 60_000 };
  const token = createSignedSessionToken(payload, "preview-v1");

  assert.deepEqual(parseSignedSessionToken(token, "preview-v1"), payload);
});

test("signed sessions reject tampering and cross-purpose reuse", () => {
  const token = createSignedSessionToken({ linkId: "link_123" }, "preview-v1");
  const [payload, signature] = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ linkId: "link_999" }),
  ).toString("base64url");

  assert.equal(
    parseSignedSessionToken(`${tamperedPayload}.${signature}`, "preview-v1"),
    null,
  );
  assert.equal(parseSignedSessionToken(token, "dataroom-v1"), null);
  assert.equal(
    parseSignedSessionToken(`${payload}.invalid`, "preview-v1"),
    null,
  );
});

test("session creation fails closed without NEXTAUTH_SECRET", () => {
  const configuredSecret = process.env.NEXTAUTH_SECRET;
  delete process.env.NEXTAUTH_SECRET;

  try {
    assert.throws(
      () => createSignedSessionToken({ linkId: "link_123" }, "preview-v1"),
      /NEXTAUTH_SECRET is not set/,
    );
  } finally {
    process.env.NEXTAUTH_SECRET = configuredSecret;
  }
});
