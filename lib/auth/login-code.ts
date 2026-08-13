import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

import prisma from "@/lib/prisma";

const LOGIN_CODE_TTL_MS = 15 * 60 * 1000;

export interface LoginCodeData {
  email: string;
  code: string;
  callbackUrl: string;
  createdAt: number;
}

export interface AuthRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function rateLimitKey(scope: string, subject: string): string {
  const subjectHash = createHash("sha256")
    .update(subject.trim().toLowerCase())
    .digest("hex");

  return `${scope}:${subjectHash}`;
}

export async function storeLoginCode({
  email,
  code,
  callbackUrl,
}: Pick<LoginCodeData, "email" | "code" | "callbackUrl">): Promise<void> {
  const now = new Date();
  const normalizedEmail = normalizeEmail(email);

  await prisma.$transaction([
    prisma.loginCode.deleteMany({
      where: { expiresAt: { lte: now } },
    }),
    prisma.loginCode.create({
      data: {
        email: normalizedEmail,
        code: code.toUpperCase(),
        callbackUrl,
        expiresAt: new Date(now.getTime() + LOGIN_CODE_TTL_MS),
      },
    }),
  ]);
}

export async function deleteLoginCode(
  email: string,
  code: string,
): Promise<void> {
  await prisma.loginCode.deleteMany({
    where: {
      email: normalizeEmail(email),
      code: code.trim().toUpperCase(),
    },
  });
}

/**
 * Fetches and consumes a login code in one database operation. A wrong code
 * leaves the valid code intact, while an expired or used code cannot be reused.
 */
export async function fetchAndDeleteLoginCodeData(
  email: string,
  code: string,
): Promise<LoginCodeData | null> {
  try {
    const loginCode = await prisma.loginCode.delete({
      where: {
        email_code: {
          email: normalizeEmail(email),
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (loginCode.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      email: loginCode.email,
      code: loginCode.code,
      callbackUrl: loginCode.callbackUrl,
      createdAt: loginCode.createdAt.getTime(),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return null;
    }

    throw error;
  }
}

/**
 * Fixed-window rate limiting backed by PostgreSQL. The subject is hashed so
 * email addresses and IP addresses are not stored in the rate-limit table.
 */
export async function consumeAuthRateLimit({
  scope,
  subject,
  limit,
  windowMs,
}: {
  scope: string;
  subject: string;
  limit: number;
  windowMs: number;
}): Promise<AuthRateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const key = rateLimitKey(scope, subject);

  await prisma.authRateLimit.deleteMany({
    where: { resetAt: { lte: now }, key: { not: key } },
  });

  const [record] = await prisma.$queryRaw<
    Array<{ count: number; resetAt: Date }>
  >(Prisma.sql`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "AuthRateLimit"."resetAt" <= ${now} THEN 1
        ELSE "AuthRateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "AuthRateLimit"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "AuthRateLimit"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt"
  `);

  if (!record) {
    throw new Error("Unable to update authentication rate limit");
  }

  return {
    success: record.count <= limit,
    limit,
    remaining: Math.max(0, limit - record.count),
    reset: record.resetAt.getTime(),
  };
}
