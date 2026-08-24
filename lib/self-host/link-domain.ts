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

type LinkDomainFields = {
  id: string;
  domainId?: string | null;
  domainSlug?: string | null;
  slug?: string | null;
};

function getRuntimeEnvironment(): LinkDomainEnvironment {
  return {
    selfHosted: process.env.NEXT_PUBLIC_SELF_HOSTED,
    appBaseHost: process.env.NEXT_PUBLIC_APP_BASE_HOST,
    marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
  };
}

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
  environment: LinkDomainEnvironment = getRuntimeEnvironment(),
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

export function hasCustomLinkDomain(
  link: LinkDomainFields,
  environment?: LinkDomainEnvironment,
): boolean {
  return Boolean(
    link.domainId &&
    link.domainSlug &&
    link.slug &&
    !isBuiltInLinkDomain(link.domainSlug, environment),
  );
}

function getPublicLinkOrigin(
  environment: LinkDomainEnvironment = getRuntimeEnvironment(),
): string {
  const configuredUrl = environment.marketingUrl ?? environment.baseUrl;
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).origin;
    } catch {
      // Fall through to the configured host or the Papermark default.
    }
  }

  const configuredHost = normalizeHost(environment.appBaseHost);
  if (configuredHost) {
    const protocol = configuredHost.startsWith("localhost") ? "http" : "https";
    return `${protocol}://${configuredHost}`;
  }

  return "https://www.papermark.com";
}

export function constructLinkUrl(
  link: LinkDomainFields,
  environment?: LinkDomainEnvironment,
): string {
  if (hasCustomLinkDomain(link, environment)) {
    return `https://${link.domainSlug}/${link.slug}`;
  }

  return `${getPublicLinkOrigin(environment)}/view/${link.id}`;
}

export function getLinkDisplayUrl(
  link: LinkDomainFields,
  environment?: LinkDomainEnvironment,
): string {
  return constructLinkUrl(link, environment).replace(/^https?:\/\//i, "");
}

/**
 * Hide stale built-in-domain relations from clients. These rows can remain
 * after a self-hosted application hostname was previously added as a custom
 * domain, but they must use the stable /view/:id route.
 */
export function normalizeBuiltInLinkDomain<T extends LinkDomainFields>(
  link: T,
  environment?: LinkDomainEnvironment,
): T {
  if (!link.domainId || !isBuiltInLinkDomain(link.domainSlug, environment)) {
    return link;
  }

  return {
    ...link,
    domainId: null,
    domainSlug: null,
    slug: null,
  };
}
