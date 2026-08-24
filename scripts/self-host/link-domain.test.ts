import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILT_IN_LINK_DOMAIN_VALUE,
  type LinkDomainEnvironment,
  constructLinkUrl,
  getBuiltInLinkDomain,
  getCustomLinkDomains,
  getLinkDisplayUrl,
  getProtectedLinkDomains,
  hasCustomLinkDomain,
  isBuiltInLinkDomain,
  normalizeBuiltInLinkDomain,
} from "../../lib/self-host/link-domain.ts";

const selfHostedEnvironment: LinkDomainEnvironment = {
  selfHosted: "true",
  appBaseHost: "docs.bonumworks.com",
  marketingUrl: "https://marketing.example.com",
  baseUrl: "https://app.example.com",
};

test("self-hosted links use the application host as their built-in domain", () => {
  assert.equal(
    getBuiltInLinkDomain(selfHostedEnvironment),
    "docs.bonumworks.com",
  );
});

test("self-hosted link domain falls back to the configured public URL", () => {
  assert.equal(
    getBuiltInLinkDomain({
      selfHosted: "true",
      marketingUrl: "https://docs.example.com/path",
    }),
    "docs.example.com",
  );
});

test("hosted Papermark keeps its original built-in domain", () => {
  assert.equal(
    getBuiltInLinkDomain({
      selfHosted: "false",
      appBaseHost: "app.papermark.com",
    }),
    BUILT_IN_LINK_DOMAIN_VALUE,
  );
});

test("the application host is not treated as a custom domain", () => {
  assert.equal(
    isBuiltInLinkDomain("docs.bonumworks.com", selfHostedEnvironment),
    true,
  );
  assert.equal(
    isBuiltInLinkDomain("https://DOCS.bonumworks.com", selfHostedEnvironment),
    true,
  );
  assert.equal(
    isBuiltInLinkDomain("recipient.example.com", selfHostedEnvironment),
    false,
  );
});

test("background domain management protects every built-in hostname", () => {
  assert.deepEqual(getProtectedLinkDomains(selfHostedEnvironment), [
    "papermark.io",
    "papermark.com",
    "docs.bonumworks.com",
  ]);
});

test("the custom-domain choices exclude a duplicate application hostname", () => {
  const domains = [
    { slug: "docs.bonumworks.com", verified: false, isDefault: true },
    { slug: "deals.bonumworks.com", verified: true, isDefault: false },
  ];

  assert.deepEqual(getCustomLinkDomains(domains, selfHostedEnvironment), [
    { slug: "deals.bonumworks.com", verified: true, isDefault: false },
  ]);
});

test("stale application-domain links use the stable built-in viewer route", () => {
  const environment: LinkDomainEnvironment = {
    ...selfHostedEnvironment,
    marketingUrl: "https://docs.bonumworks.com",
  };
  const staleLink = {
    id: "link_123",
    domainId: "domain_123",
    domainSlug: "docs.bonumworks.com",
    slug: "old-short-link",
  };

  assert.equal(hasCustomLinkDomain(staleLink, environment), false);
  assert.equal(
    constructLinkUrl(staleLink, environment),
    "https://docs.bonumworks.com/view/link_123",
  );
  assert.equal(
    getLinkDisplayUrl(staleLink, environment),
    "docs.bonumworks.com/view/link_123",
  );
  assert.deepEqual(normalizeBuiltInLinkDomain(staleLink, environment), {
    id: "link_123",
    domainId: null,
    domainSlug: null,
    slug: null,
  });
});

test("verified custom domains retain their short share URL", () => {
  const customLink = {
    id: "link_123",
    domainId: "domain_456",
    domainSlug: "deals.bonumworks.com",
    slug: "investor-room",
  };

  assert.equal(hasCustomLinkDomain(customLink, selfHostedEnvironment), true);
  assert.equal(
    constructLinkUrl(customLink, selfHostedEnvironment),
    "https://deals.bonumworks.com/investor-room",
  );
});
