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
    required: ["RESEND_API_KEY=", "RESEND_FROM_EMAIL="],
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
      "Self-host email authentication uses PostgreSQL and a configured sender.",
    );
  }
} catch (error) {
  console.error("Unable to audit self-host email authentication:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
