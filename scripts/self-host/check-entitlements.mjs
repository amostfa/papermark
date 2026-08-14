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
    required: ["NEXT_PUBLIC_SELF_HOSTED=true"],
  },
  {
    file: "lib/self-host/entitlements.ts",
    required: [
      'SELF_HOSTED_PLAN = "datarooms-unlimited"',
      'process.env.NEXT_PUBLIC_SELF_HOSTED === "true"',
      "getEffectivePlan",
    ],
  },
  {
    file: "lib/prisma.ts",
    required: [
      'name: "self-hosted-entitlements"',
      "getEffectivePlan(team.plan)",
    ],
  },
  {
    file: "lib/swr/use-billing.ts",
    required: [
      "teamId && !isSelfHosted",
      "parsePlan(SELF_HOSTED_PLAN)",
      "isSelfHosted,",
    ],
  },
  {
    file: "components/sidebar/app-sidebar.tsx",
    required: [
      "...(isSelfHosted",
      'title: "Billing"',
      "enabled: !!currentTeam?.id && !isSelfHosted",
      "!isSelfHosted && !slackIntegration && showSlackBanner",
      "{!isSelfHosted ? (",
    ],
  },
  {
    file: "components/layouts/mobile-more-menu.tsx",
    required: [
      "enabled: !!currentTeam?.id && !isSelfHosted",
      "!isSelfHosted && !slackIntegration",
      "!isSelfHosted && (linksLimit || documentsLimit)",
      '...(isSelfHosted ? [] : [{ label: "Slack", href: "/settings/slack" }])',
      '...(isSelfHosted ? [] : [{ label: "Billing", href: "/settings/billing" }])',
    ],
  },
  {
    file: "lib/swr/use-slack-integration.ts",
    required: ["enabled && !isSelfHosted && teamId"],
  },
  {
    file: "lib/swr/use-subscription-currency.ts",
    required: [
      "teamId && !isSelfHosted",
      "loading: !isSelfHosted && isLoading",
    ],
  },
  {
    file: "lib/swr/use-geo-currency.ts",
    required: ['isSelfHosted ? null : "/api/geo/currency"'],
  },
  {
    file: "components/billing/upgrade-plan-container.tsx",
    required: [
      "if (isSelfHosted)",
      "SaaS billing is disabled.",
      "without a Stripe subscription.",
    ],
  },
  {
    file: ".github/workflows/self-host-ci.yml",
    required: [
      'NEXT_PUBLIC_SELF_HOSTED: "true"',
      "npm run selfhost:entitlements-db-smoke",
    ],
  },
];

try {
  const violations = [];

  for (const check of checks) {
    const contents = await source(check.file);
    for (const text of check.required) {
      if (!contents.includes(text)) {
        violations.push(`${check.file}: missing ${JSON.stringify(text)}`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("Self-host entitlement configuration is unsafe:");
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Self-host mode bypasses SaaS billing while preserving stored plan data.",
    );
  }
} catch (error) {
  console.error("Unable to audit self-host entitlements:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
