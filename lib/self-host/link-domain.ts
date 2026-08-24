export const BUILT_IN_LINK_DOMAIN_VALUE = "papermark.com";

const LEGACY_BUILT_IN_LINK_DOMAINS = [
  "papermark.io",
  BUILT_IN_LINK_DOMAIN_VALUE,
] as const;

export type LinkDomainEnvironment = Readonly<{
  selfHosted?: string;
  appBaseHost?: string;
  marketingUrl?: string;
  baseUrl?: string;
}>;

function normalizeHost(value?: string): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(candidate)
        ? candidate
        : `https://${candidate}`,
    );
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

export function getBuiltInLinkDomain(
  environment: LinkDomainEnvironment = {
    selfHosted: process.env.NEXT_PUBLIC_SELF_HOSTED,
    appBaseHost: process.env.NEXT_PUBLIC_APP_BASE_HOST,
    marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  },
): string {
  if (environment.selfHosted !== "true") {
    return BUILT_IN_LINK_DOMAIN_VALUE;
  }

  return (
    normalizeHost(environment.appBaseHost) ??
    normalizeHost(environment.marketingUrl) ??
    normalizeHost(environment.baseUrl) ??
    BUILT_IN_LINK_DOMAIN_VALUE
  );
}

export function isBuiltInLinkDomain(
  domain: string | null | undefined,
  environment?: LinkDomainEnvironment,
): boolean {
  if (!domain) return true;

  const normalizedDomain = normalizeHost(domain);
  return getProtectedLinkDomains(environment).includes(normalizedDomain ?? "");
}

export function getProtectedLinkDomains(
  environment?: LinkDomainEnvironment,
): string[] {
  return [
    ...new Set([
      ...LEGACY_BUILT_IN_LINK_DOMAINS,
      getBuiltInLinkDomain(environment),
    ]),
  ];
}

export function getCustomLinkDomains<T extends { slug: string }>(
  domains: T[] | undefined,
  environment?: LinkDomainEnvironment,
): T[] | undefined {
  return domains?.filter(({ slug }) => !isBuiltInLinkDomain(slug, environment));
}
