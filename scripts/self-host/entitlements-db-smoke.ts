import assert from "node:assert/strict";

import prisma from "@/lib/prisma";
import {
  SELF_HOSTED_PLAN,
  isSelfHostedDeployment,
} from "@/lib/self-host/entitlements";

async function main() {
  assert.equal(
    isSelfHostedDeployment(),
    true,
    "NEXT_PUBLIC_SELF_HOSTED must be true for the entitlement smoke test",
  );

  const email = `self-host-entitlements-${Date.now()}@example.invalid`;
  const user = await prisma.user.create({ data: { email } });
  let teamId: string | undefined;

  try {
    const created = await prisma.team.create({
      data: {
        name: "Self-host entitlement smoke test",
        users: { create: { role: "ADMIN", userId: user.id } },
      },
      select: { id: true, plan: true },
    });
    teamId = created.id;

    const nested = await prisma.userTeam.findUniqueOrThrow({
      where: { userId_teamId: { teamId, userId: user.id } },
      select: { team: { select: { plan: true } } },
    });
    const stored = await prisma.$queryRawUnsafe<Array<{ plan: string }>>(
      'SELECT "plan" FROM "Team" WHERE "id" = $1',
      teamId,
    );

    assert.equal(created.plan, SELF_HOSTED_PLAN);
    assert.equal(nested.team.plan, SELF_HOSTED_PLAN);
    assert.equal(
      stored[0]?.plan,
      "free",
      "the runtime override must not rewrite stored billing data",
    );

    console.log(
      "Self-host entitlements apply to direct and nested team reads without mutating billing data.",
    );
  } finally {
    if (teamId) await prisma.team.delete({ where: { id: teamId } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
