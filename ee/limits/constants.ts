// Numeric `null` values mean unlimited throughout the core application.
export type TFileSizeLimits = {
  video?: number | null;
  document?: number | null;
  image?: number | null;
  excel?: number | null;
  maxFiles?: number | null;
  maxPages?: number | null;
};

export type TPlanLimits = {
  users: number | null;
  links: number | null;
  documents: number | null;
  domains: number | null;
  datarooms: number | null;
  customDomainOnPro: boolean;
  customDomainInDataroom: boolean;
  advancedLinkControlsOnPro: boolean | null;
  watermarkOnBusiness?: boolean | null;
  agreementOnBusiness?: boolean | null;
  linkCustomFields?: number | null;
  conversationsInDataroom?: boolean;
  fileSizeLimits?: TFileSizeLimits;
};

export const SELF_HOSTED_LIMITS: TPlanLimits = {
  users: null,
  links: null,
  documents: null,
  domains: null,
  datarooms: null,
  customDomainOnPro: false,
  customDomainInDataroom: false,
  advancedLinkControlsOnPro: false,
  watermarkOnBusiness: false,
  agreementOnBusiness: false,
  conversationsInDataroom: false,
  linkCustomFields: 0,
  fileSizeLimits: {
    video: null,
    document: null,
    image: null,
    excel: null,
    maxFiles: null,
    maxPages: null,
  },
};

export const FREE_PLAN_LIMITS = SELF_HOSTED_LIMITS;
export const PRO_PLAN_LIMITS = SELF_HOSTED_LIMITS;
export const BUSINESS_PLAN_LIMITS = SELF_HOSTED_LIMITS;
export const DATAROOMS_PLAN_LIMITS = SELF_HOSTED_LIMITS;
export const DATAROOMS_PLUS_PLAN_LIMITS = SELF_HOSTED_LIMITS;
export const DATAROOMS_PREMIUM_PLAN_LIMITS = SELF_HOSTED_LIMITS;
export const DATAROOMS_UNLIMITED_PLAN_LIMITS = SELF_HOSTED_LIMITS;

export const PAUSED_PLAN_LIMITS = {
  canCreateLinks: true,
  canReceiveViews: true,
  canCreateDocuments: true,
  canCreateDatarooms: true,
  canViewAnalytics: true,
  canAccessExistingContent: true,
};
