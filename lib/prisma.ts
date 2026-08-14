import { PrismaClient } from "@prisma/client";

import { getEffectivePlan } from "@/lib/self-host/entitlements";

function createPrismaClient() {
  return new PrismaClient().$extends({
    name: "self-hosted-entitlements",
    result: {
      team: {
        plan: {
          needs: { plan: true },
          compute(team) {
            return getEffectivePlan(team.plan);
          },
        },
      },
    },
  });
}

declare global {
  var prisma: PrismaClient | undefined;
}

// The extension only changes the runtime value of an existing string field.
// Preserve PrismaClient's public type so transaction helpers and adapters that
// accept the base client do not inherit the extension's internal type map.
const prisma =
  global.prisma || (createPrismaClient() as unknown as PrismaClient);

if (process.env.NODE_ENV === "development") global.prisma = prisma;

export default prisma;
