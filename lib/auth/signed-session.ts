import crypto from "crypto";

const MAX_SIGNED_SESSION_LENGTH = 8192;

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Signed sessions cannot be issued because NEXTAUTH_SECRET is not set.",
    );
  }

  return secret;
}

function createSignature(
  encodedPayload: string,
  purpose: string,
  secret: string,
): Buffer {
  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}\0${encodedPayload}`)
    .digest();
}

/**
 * Sign short-lived session state without requiring an external key-value store.
 * The purpose value provides domain separation between different token types.
 */
export function createSignedSessionToken(
  payload: unknown,
  purpose: string,
): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = createSignature(
    encodedPayload,
    purpose,
    getSigningSecret(),
  ).toString("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a signed session token. Schema and expiry validation remain
 * the responsibility of the caller because each session type has different
 * fields and lifetimes.
 */
export function parseSignedSessionToken(
  token: string | null | undefined,
  purpose: string,
): unknown | null {
  if (
    !token ||
    typeof token !== "string" ||
    token.length > MAX_SIGNED_SESSION_LENGTH
  ) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature) return null;

  let secret: string;
  try {
    secret = getSigningSecret();
  } catch {
    return null;
  }

  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }

  const expectedSignature = createSignature(encodedPayload, purpose, secret);
  if (
    providedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(providedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as unknown;
  } catch {
    return null;
  }
}
