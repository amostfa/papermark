import Link from "next/link";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useTeam } from "@/context/team-context";
import { PlanEnum } from "@/ee/stripe/constants";
import { Domain, LinkType } from "@prisma/client";
import { ShuffleIcon } from "lucide-react";
import { customAlphabet } from "nanoid";
import { mutate } from "swr";

import { BLOCKED_PATHNAMES } from "@/lib/constants";
import {
  BUILT_IN_LINK_DOMAIN_VALUE,
  getBuiltInLinkDomain,
  getCustomLinkDomains,
  isBuiltInLinkDomain,
} from "@/lib/self-host/link-domain";
import { BasePlan, usePlan } from "@/lib/swr/use-billing";
import useLimits from "@/lib/swr/use-limits";
import { cn } from "@/lib/utils";

import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";
import { AddDomainModal } from "@/components/domains/add-domain-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonTooltip } from "@/components/ui/tooltip";

import { DEFAULT_LINK_TYPE } from ".";

// Unambiguous alphabet: excludes easily confused characters (0/O, 1/l/I)
const generateRandomSlug = customAlphabet(
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz",
  10,
);

const builtInLinkDomain = getBuiltInLinkDomain();

export default function DomainSection({
  data,
  setData,
  domains,
  linkType,
  editLink,
}: {
  data: DEFAULT_LINK_TYPE;
  setData: Dispatch<SetStateAction<DEFAULT_LINK_TYPE>>;
  domains?: Domain[];
  linkType: Omit<LinkType, "WORKFLOW_LINK">;
  editLink?: boolean;
}) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
  // The self-hosted app hostname is a built-in link domain, not a custom one.
  const [displayValue, setDisplayValue] = useState<string>(
    editLink && data.domain && !isBuiltInLinkDomain(data.domain)
      ? data.domain
      : BUILT_IN_LINK_DOMAIN_VALUE,
  );
  const teamInfo = useTeam();
  const { limits } = useLimits();

  const { isBusiness, isDatarooms, isDataroomsPlus } = usePlan();

  const customDomains = useMemo(() => getCustomLinkDomains(domains), [domains]);

  // Check plan eligibility for custom domains
  const canUseCustomDomainForDocument =
    isBusiness || isDatarooms || isDataroomsPlus || limits?.customDomainOnPro;
  const canUseCustomDomainForDataroom =
    isDatarooms || isDataroomsPlus || limits?.customDomainInDataroom;

  // Check if we're editing a link with a custom domain
  const isEditingCustomDomain =
    editLink && data.domain && !isBuiltInLinkDomain(data.domain) ? true : false;

  const generateAndSetSlug = useCallback(() => {
    const newSlug = generateRandomSlug();
    setData((prev) => ({ ...prev, slug: newSlug }));
  }, [setData]);

  const handleDomainChange = (value: string) => {
    const canChangeCustomDomain =
      linkType === "DOCUMENT_LINK"
        ? canUseCustomDomainForDocument
        : canUseCustomDomainForDataroom;

    if (isEditingCustomDomain && !canChangeCustomDomain) {
      setDisplayValue(data.domain ?? BUILT_IN_LINK_DOMAIN_VALUE);
      return;
    }

    // Handle opening the add domain modal
    if (value === "add_domain" || value === "add_dataroom_domain") {
      setModalOpen(true);
      setData((prev) => ({
        ...prev,
        domain: BUILT_IN_LINK_DOMAIN_VALUE,
      }));
      setDisplayValue(BUILT_IN_LINK_DOMAIN_VALUE);
      return;
    }

    // Check if this is a custom domain selection.
    if (value !== BUILT_IN_LINK_DOMAIN_VALUE) {
      // Show upgrade modal if user doesn't have the right plan
      if (
        (linkType === "DOCUMENT_LINK" && !canUseCustomDomainForDocument) ||
        (linkType === "DATAROOM_LINK" && !canUseCustomDomainForDataroom)
      ) {
        setUpgradeModalOpen(true);
        setData((prev) => ({
          ...prev,
          domain: BUILT_IN_LINK_DOMAIN_VALUE,
        }));
        setDisplayValue(BUILT_IN_LINK_DOMAIN_VALUE);
        return;
      }

      // Auto-generate a slug if there isn't one yet
      setData((prev) => ({
        ...prev,
        domain: value,
        ...(!prev.slug && { slug: generateRandomSlug() }),
      }));
      setDisplayValue(value);
      return;
    }

    // Update domain normally if allowed
    setData((prev) => ({ ...prev, domain: value }));
    setDisplayValue(value);
  };

  const handleSelectFocus = () => {
    // Assuming your fetcher key for domains is '/api/teams/:teamId/domains'
    mutate(`/api/teams/${teamInfo?.currentTeam?.id}/domains`);
  };

  useEffect(() => {
    if (customDomains && !editLink) {
      const defaultDomain = customDomains.find((domain) => domain.isDefault);

      // Only set a custom domain if the plan allows it
      const canUseCustomDomain =
        (linkType === "DOCUMENT_LINK" && canUseCustomDomainForDocument) ||
        (linkType === "DATAROOM_LINK" && canUseCustomDomainForDataroom);

      const domainValue = canUseCustomDomain
        ? (defaultDomain?.slug ?? BUILT_IN_LINK_DOMAIN_VALUE)
        : BUILT_IN_LINK_DOMAIN_VALUE;

      // Auto-generate a slug when a custom domain is auto-selected as default
      const isCustomDomain =
        domainValue !== BUILT_IN_LINK_DOMAIN_VALUE && canUseCustomDomain;

      setData((prev) => ({
        ...prev,
        domain: domainValue,
        ...(isCustomDomain && !prev.slug && { slug: generateRandomSlug() }),
      }));

      setDisplayValue(domainValue);
    }
  }, [
    customDomains,
    editLink,
    linkType,
    canUseCustomDomainForDocument,
    canUseCustomDomainForDataroom,
    setData,
  ]);

  // Set defaultDomain based on plan type and link type
  const defaultDomain = editLink
    ? data.domain && !isBuiltInLinkDomain(data.domain)
      ? data.domain
      : BUILT_IN_LINK_DOMAIN_VALUE
    : (linkType === "DOCUMENT_LINK" && canUseCustomDomainForDocument) ||
        (linkType === "DATAROOM_LINK" && canUseCustomDomainForDataroom)
      ? (customDomains?.find((domain) => domain.isDefault)?.slug ??
        BUILT_IN_LINK_DOMAIN_VALUE)
      : BUILT_IN_LINK_DOMAIN_VALUE;

  // Set the initial display value when component mounts
  useEffect(() => {
    setDisplayValue(defaultDomain);
  }, [defaultDomain, editLink]);

  useEffect(() => {
    if (
      editLink &&
      data.domain &&
      data.domain !== BUILT_IN_LINK_DOMAIN_VALUE &&
      isBuiltInLinkDomain(data.domain)
    ) {
      setData((prev) => ({
        ...prev,
        domain: BUILT_IN_LINK_DOMAIN_VALUE,
        slug: null,
      }));
    }
  }, [data.domain, editLink, setData]);

  const hasCustomDomain = !isBuiltInLinkDomain(data.domain);
  const currentDomain = customDomains?.find(
    (domain) => domain.slug === data.domain,
  );
  const isDomainVerified = currentDomain?.verified;

  const isSlugInvalid =
    !!data.slug &&
    (!/^[a-zA-Z0-9-]+$/.test(data.slug) ||
      BLOCKED_PATHNAMES.includes(`/${data.slug}`));

  const isDisabled =
    linkType === "DOCUMENT_LINK"
      ? isEditingCustomDomain && !canUseCustomDomainForDocument
      : isEditingCustomDomain && !canUseCustomDomainForDataroom;

  return (
    <>
      <Label htmlFor="link-domain">Domain</Label>
      <div className="flex">
        <Select
          value={displayValue}
          onValueChange={handleDomainChange}
          onOpenChange={handleSelectFocus}
          disabled={isDisabled}
        >
          <SelectTrigger
            className={cn(
              "flex h-10 w-full rounded-none rounded-l-md border border-input bg-white text-foreground placeholder-muted-foreground focus:border-muted-foreground focus:outline-none focus:ring-inset focus:ring-muted-foreground dark:border-gray-500 dark:bg-gray-800 focus:dark:bg-transparent sm:text-sm",
              hasCustomDomain ? "" : "border-r-1 rounded-r-md",
            )}
          >
            <SelectValue placeholder="Select a domain" />
          </SelectTrigger>
          <SelectContent className="flex w-full rounded-md border border-input bg-white text-foreground placeholder-muted-foreground focus:border-muted-foreground focus:outline-none focus:ring-inset focus:ring-muted-foreground dark:border-gray-500 dark:bg-gray-800 focus:dark:bg-transparent sm:text-sm">
            <SelectItem
              value={BUILT_IN_LINK_DOMAIN_VALUE}
              className="hover:bg-muted"
            >
              {builtInLinkDomain}
            </SelectItem>
            {linkType === "DOCUMENT_LINK" && (
              <>
                {customDomains?.map(({ slug }) => (
                  <SelectItem
                    key={slug}
                    value={slug}
                    className={cn(
                      "hover:bg-muted hover:dark:bg-gray-700",
                      !canUseCustomDomainForDocument && "opacity-50",
                    )}
                  >
                    {slug}
                    {canUseCustomDomainForDocument || isEditingCustomDomain
                      ? ""
                      : " (upgrade to use)"}
                  </SelectItem>
                ))}
              </>
            )}
            {linkType === "DATAROOM_LINK" && (
              <>
                {customDomains?.map(({ slug }) => (
                  <SelectItem
                    key={slug}
                    value={slug}
                    className={cn(
                      "hover:bg-muted hover:dark:bg-gray-700",
                      !canUseCustomDomainForDataroom && "opacity-50",
                    )}
                  >
                    {slug}
                    {canUseCustomDomainForDataroom || isEditingCustomDomain
                      ? ""
                      : " (upgrade to use)"}
                  </SelectItem>
                ))}
              </>
            )}
            <SelectItem
              className="hover:bg-muted hover:dark:bg-gray-700"
              value={
                linkType === "DOCUMENT_LINK"
                  ? "add_domain"
                  : "add_dataroom_domain"
              }
            >
              Add a custom domain ✨
            </SelectItem>
          </SelectContent>
        </Select>

        {hasCustomDomain ? (
          <>
            <Input
              type="text"
              name="key"
              required
              value={data.slug || ""}
              disabled={isDisabled}
              pattern="^[a-zA-Z0-9-]+$"
              onKeyDown={(e) => {
                // Allow navigation keys, backspace, delete, etc.
                if (e.key.length === 1 && !/^[a-zA-Z0-9-]$/.test(e.key)) {
                  e.preventDefault();
                }
              }}
              onInvalid={(e) => {
                const currentValue = e.currentTarget.value;
                const isBlocked = BLOCKED_PATHNAMES.includes(
                  `/${currentValue}`,
                );

                if (isBlocked) {
                  e.currentTarget.setCustomValidity(
                    "This pathname is blocked. Please choose another one.",
                  );
                } else {
                  e.currentTarget.setCustomValidity(
                    "Only letters, numbers, and '-' are allowed.",
                  );
                }
              }}
              autoComplete="off"
              className={cn(
                "hidden rounded-none focus:ring-inset",
                hasCustomDomain ? "flex" : "",
                isDisabled ? "opacity-50" : "",
              )}
              placeholder="deck"
              onChange={(e) => {
                if (isDisabled) return;

                const currentValue = e.target.value.replace(
                  /[^a-zA-Z0-9-]/g,
                  "",
                );
                const isBlocked = BLOCKED_PATHNAMES.includes(
                  `/${currentValue}`,
                );

                if (isBlocked) {
                  e.currentTarget.setCustomValidity(
                    "This pathname is blocked. Please choose another one.",
                  );
                } else {
                  e.currentTarget.setCustomValidity("");
                }
                setData((prev) => ({ ...prev, slug: currentValue }));
              }}
              aria-invalid={isSlugInvalid}
            />
            <ButtonTooltip content="Generate random slug">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 min-w-10 rounded-l-none border-l-0"
                disabled={isDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  generateAndSetSlug();
                }}
              >
                <ShuffleIcon className="h-4 w-4" />
              </Button>
            </ButtonTooltip>
          </>
        ) : null}
      </div>

      {isDisabled && (
        <div
          className="mt-2 text-sm text-muted-foreground"
          onClick={() => {
            setUpgradeModalOpen(true);
          }}
        >
          Custom domain and path cannot be changed on an unsupported plan.
        </div>
      )}

      {hasCustomDomain && !isDomainVerified ? (
        <div className="mt-4 text-sm text-red-500">
          Your domain is not verified yet!{" "}
          <Link
            className="underline hover:text-red-500/80"
            href="/settings/domains"
            target="_blank"
          >
            Verify now
          </Link>
        </div>
      ) : null}

      {/* Add domain modal for custom domains */}
      <AddDomainModal
        open={isModalOpen}
        setOpen={setModalOpen}
        linkType={linkType}
      />

      {/* Upgrade plan modal when trying to use custom domains without the right plan */}
      <UpgradePlanModal
        clickedPlan={
          linkType === "DATAROOM_LINK" ? PlanEnum.DataRooms : PlanEnum.Business
        }
        open={isUpgradeModalOpen}
        setOpen={setUpgradeModalOpen}
        trigger={
          linkType === "DATAROOM_LINK"
            ? "select_custom_domain_dataroom"
            : "select_custom_domain_document"
        }
        highlightItem={["custom-domain"]}
      />
    </>
  );
}
