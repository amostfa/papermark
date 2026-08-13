import { tenant } from "@teamhanko/passkeys-next-auth-provider";

export const isPasskeyAuthConfigured = Boolean(
  process.env.HANKO_API_KEY && process.env.NEXT_PUBLIC_HANKO_TENANT_ID,
);

const hanko = isPasskeyAuthConfigured
  ? tenant({
      apiKey: process.env.HANKO_API_KEY!,
      tenantId: process.env.NEXT_PUBLIC_HANKO_TENANT_ID!,
    })
  : null;

export default hanko;
