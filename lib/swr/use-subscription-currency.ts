import { useTeam } from "@/context/team-context";
import type { Currency } from "@/ee/stripe/currency";
import useSWR from "swr";

import { isSelfHostedDeployment } from "@/lib/self-host/entitlements";
import { fetcher } from "@/lib/utils";

// Resolves the currency the team is already being billed in. Returns `null`
// when the team has no active subscription (so the upgrade UI can fall back to
// geo/manual selection), and `undefined` while loading. Existing customers are
// locked to this currency because Stripe subscriptions cannot mix currencies.
export function useSubscriptionCurrency(): {
  currency: Currency | null | undefined;
  loading: boolean;
} {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const isSelfHosted = isSelfHostedDeployment();

  const { data, isLoading } = useSWR<{ currency: Currency | null }>(
    teamId && !isSelfHosted ? `/api/teams/${teamId}/billing/currency` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60 * 60 * 1000,
    },
  );

  return {
    currency: isSelfHosted ? null : data?.currency,
    loading: !isSelfHosted && isLoading,
  };
}
