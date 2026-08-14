#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { repositoryRoot } from "./boundary-lib.mjs";

async function source(relativePath) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

const checks = [
  {
    file: ".env.example",
    required: [
      "NEXTAUTH_COOKIE_DOMAIN=",
      "RESEND_API_KEY=",
      "RESEND_FROM_EMAIL=",
    ],
  },
  {
    file: "lib/auth/auth-options.ts",
    required: [
      "NEXTAUTH_COOKIE_DOMAIN",
      "AUTH_COOKIE_DOMAIN",
      "USE_SECURE_AUTH_COOKIE",
    ],
    forbidden: ['domain: VERCEL_DEPLOYMENT ? ".papermark.com" : undefined'],
  },
  {
    file: "lib/emails/send-verification-request.ts",
    required: ["storeLoginCode", "consumeAuthRateLimit", "await sendEmail"],
    forbidden: ['from "@/lib/redis"', "waitUntil("],
  },
  {
    file: "app/api/auth/verify-code/route.ts",
    required: ["fetchAndDeleteLoginCodeData", "consumeAuthRateLimit"],
    forbidden: ['from "@/lib/redis"'],
  },
  {
    file: "lib/resend.ts",
    required: ['configuredFromAddress("RESEND_FROM_EMAIL")'],
  },
  {
    file: "prisma/schema/schema.prisma",
    required: ["model LoginCode {", "model AuthRateLimit {"],
  },
  {
    file: ".github/workflows/self-host-ci.yml",
    required: ["npm run selfhost:auth-db-smoke"],
  },
  {
    file: "components/auth/bonum-auth-shell.tsx",
    required: [
      "A venture studio for GOOD",
      "Good is not a side effect.",
      "Fight poverty",
      "Advance justice",
    ],
  },
  {
    file: "app/(auth)/login/page-client.tsx",
    required: ["BonumAuthShell", "BONUM workspace", "work that matters."],
    forbidden: ["Welcome to Papermark", "LogoCloud"],
  },
  {
    file: "app/(auth)/auth/email/[[...params]]/page-client.tsx",
    required: [
      "BonumAuthShell",
      "Verify and continue",
      "window.location.assign",
    ],
    forbidden: ["Papermark Logo", "LogoCloud", "router.push(data.callbackUrl)"],
  },
  {
    file: "components/emails/verification-link.tsx",
    required: ["Your BONUM login code", "A venture studio for GOOD"],
    forbidden: ["Papermark"],
  },
  {
    file: "scripts/self-host/smoke-server.mjs",
    required: ["<title>Sign in | BONUM"],
    forbidden: ["<title>Login | Papermark"],
  },
];

try {
  const violations = [];

  for (const check of checks) {
    const contents = await source(check.file);

    for (const text of check.required ?? []) {
      if (!contents.includes(text)) {
        violations.push(`${check.file}: missing ${JSON.stringify(text)}`);
      }
    }

    for (const text of check.forbidden ?? []) {
      if (contents.includes(text)) {
        violations.push(`${check.file}: contains ${JSON.stringify(text)}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("Self-host email authentication configuration is unsafe:");
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Self-host authentication uses PostgreSQL, a configured sender, and the BONUM auth surface.",
    );
  }
} catch (error) {
  console.error("Unable to audit self-host email authentication:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
