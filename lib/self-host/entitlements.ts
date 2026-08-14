export const SELF_HOSTED_PLAN = "datarooms-unlimited" as const;

export function isSelfHostedDeployment(): boolean {
  return process.env.NEXT_PUBLIC_SELF_HOSTED === "true";
}

/**
 * Keep SaaS billing data intact while treating every team as fully entitled in
 * an explicitly configured self-hosted deployment.
 */
export function getEffectivePlan(plan: string | null | undefined): string {
  return isSelfHostedDeployment() ? SELF_HOSTED_PLAN : (plan ?? "free");
}
