import { z } from "zod";

import prisma from "@/lib/prisma";

export const RestrictedTokenSubjectTypeSchema = z.enum(["user", "machine"]);
export type RestrictedTokenSubjectType = z.infer<
  typeof RestrictedTokenSubjectTypeSchema
>;

export function parseRestrictedTokenSubjectType(
  value: unknown,
): RestrictedTokenSubjectType {
  const parsed = RestrictedTokenSubjectTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "user";
}

/** Revoke user-bound keys when their owner loses access to the team. */
export function revokeUserBoundTeamTokens(userId: string, teamId: string) {
  return prisma.restrictedToken.deleteMany({
    where: { userId, teamId, subjectType: "user" },
  });
}
