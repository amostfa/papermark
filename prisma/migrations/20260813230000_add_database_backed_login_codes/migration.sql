-- Store short-lived login codes in PostgreSQL so self-hosted authentication
-- does not depend on a separate Redis service.
CREATE TABLE "LoginCode" (
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "callbackUrl" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("email", "code")
);

CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "LoginCode_expiresAt_idx" ON "LoginCode"("expiresAt");
CREATE INDEX "AuthRateLimit_resetAt_idx" ON "AuthRateLimit"("resetAt");
