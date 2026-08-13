import type { ReactNode } from "react";

import type { DataroomFolder } from "@prisma/client";
import { z } from "zod";

export const ENTERPRISE_FEATURE_DISABLED =
  "This Enterprise Edition feature is not available in this self-hosted build.";

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => unknown;
};

function unavailableResponse(response?: ApiResponse): any {
  if (
    response &&
    typeof response.status === "function" &&
    typeof response.json === "function"
  ) {
    return response.status(404).json({ error: ENTERPRISE_FEATURE_DISABLED });
  }
  return null;
}

/** Shared default for EE page components and Pages Router API handlers. */
const EnterpriseFeatureStub: any = (
  _propsOrRequest?: any,
  response?: ApiResponse,
) => {
  return unavailableResponse(response);
};

export default EnterpriseFeatureStub;

export function handleRoute(_request: unknown, response?: ApiResponse): any {
  return unavailableResponse(response);
}

const NullComponent: any = (_props: unknown) => null;
const Passthrough: any = ({ children }: { children?: ReactNode }) =>
  children ?? null;

// Enterprise controls are deliberately absent. Layout/provider shims keep the
// core viewer subtree mounted when an EE sidebar would normally wrap it.
export const AgentsSettingsCard = NullComponent;
export const DocumentAIDialog = NullComponent;
export const ViewerChatPanel = NullComponent;
export const ViewerChatToggle = NullComponent;
export const ViewerChatProvider = Passthrough;
export const ViewerChatLayout = Passthrough;
export const CancellationModal = NullComponent;
export const BannerEditor = NullComponent;
export const BrandingLinkPreviewForm = (_props: {
  onEnabledChange?: (enabled: boolean) => void;
  [key: string]: any;
}) => null;
export const BrandingPreviewChrome = Passthrough;
export const BrandingSocialPreviewReadonly = NullComponent;
export const CollapsibleBrandingSection = Passthrough;
export const DataroomLayoutPresetCards = NullComponent;
export const VisitorLanguageCard = NullComponent;
export const ConversationSidebarProvider = Passthrough;
export const ConversationSidebarLayout = Passthrough;
export const ConversationViewSidebar = NullComponent;
export const InviteViewersModal = (_props: {
  setOpen?: (open: boolean) => void;
  [key: string]: any;
}) => null;
export const ConfidentialViewOverlay = NullComponent;
export const DataroomLinkSheet = NullComponent;
export const PermissionsSheet = NullComponent;
type RedactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  onStartNew?: () => void;
};
export const RedactionConfigDialog = (_props: RedactionDialogProps) => null;
export const RedactionJobsDialog = (_props: RedactionDialogProps) => null;
export const RedactionLauncher = NullComponent;
export const RedactionWorkspace = NullComponent;
export const RequestListSettingsCard = NullComponent;
export const RequestListView = NullComponent;
export const RequestListButton = NullComponent;
export const RequestListSheet = NullComponent;
export const DirectorySyncConfigModal = NullComponent;
export const SAMLConfigModal = NullComponent;
export const SSOEnforcementToggle = NullComponent;
export const SSOLogin = NullComponent;

export function useViewerChatSafe(): any {
  return null;
}

export function useConversationSidebarSafe(): any {
  return null;
}

export type ConversationSidebarProps = Record<string, unknown>;
export type ItemPermission = Record<string, unknown>;

// Branding values are needed by public core pages even though the EE editors
// themselves are disabled.
export interface BrandLogoFields {
  logo: string | null;
  hideLogo: boolean | null;
}

export type ResolvedBrandLogo =
  | { kind: "custom"; src: string }
  | { kind: "papermark" }
  | { kind: "none" };

export function mergeBrandLogoFields({
  dataroom,
  team,
}: {
  dataroom?: Partial<BrandLogoFields> | null;
  team?: Partial<BrandLogoFields> | null;
}): BrandLogoFields {
  return {
    logo: dataroom?.logo ?? team?.logo ?? null,
    hideLogo: dataroom?.hideLogo ?? team?.hideLogo ?? false,
  };
}

export function resolveBrandLogo(
  brand?: Partial<BrandLogoFields> | null,
): ResolvedBrandLogo {
  if (brand?.hideLogo) return { kind: "none" };
  if (typeof brand?.logo === "string" && brand.logo.trim()) {
    return { kind: "custom", src: brand.logo };
  }
  return { kind: "papermark" };
}

export type DataroomBannerKind = "none" | "image" | "video" | "youtube";

export type ClassifiedDataroomBanner = {
  kind: DataroomBannerKind;
  src: string | null;
  youtubeId?: string;
};

function getYoutubeId(source: string): string | undefined {
  try {
    const url = new URL(source);
    if (url.hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0];
    }
    if (url.hostname.endsWith("youtube.com")) {
      return (
        url.searchParams.get("v") ||
        url.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1]
      );
    }
  } catch {
    return undefined;
  }
}

export function classifyDataroomBanner(
  source?: string | null,
): ClassifiedDataroomBanner {
  const src = source?.trim();
  if (!src || src === "no-banner") return { kind: "none", src: null };

  const youtubeId = getYoutubeId(src);
  if (youtubeId) return { kind: "youtube", src, youtubeId };

  const pathname = src.split(/[?#]/, 1)[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogg)$/.test(pathname)) {
    return { kind: "video", src };
  }
  return { kind: "image", src };
}

export type DataroomCardLayout = "LIST" | "GRID" | "COMPACT";
export type DataroomViewerHeaderStyle = "DEFAULT" | "SPLIT" | "NOTION";
export type DataroomViewerLayoutPreset =
  | "STANDARD"
  | "STRICT"
  | "MODERN"
  | "NOTION"
  | "CUSTOM";
export type DataroomLayoutCardId = DataroomViewerLayoutPreset;

export const DataroomCardLayoutSchema = z.enum(["LIST", "GRID", "COMPACT"]);
export const DataroomViewerHeaderStyleSchema = z.enum([
  "DEFAULT",
  "SPLIT",
  "NOTION",
]);
export const DataroomViewerLayoutPresetSchema = z.enum([
  "STANDARD",
  "STRICT",
  "MODERN",
  "NOTION",
  "CUSTOM",
]);

export function asDataroomCardLayout(value: unknown): DataroomCardLayout {
  return DataroomCardLayoutSchema.safeParse(value).data ?? "LIST";
}

export function asDataroomViewerHeaderStyle(
  value: unknown,
): DataroomViewerHeaderStyle {
  return DataroomViewerHeaderStyleSchema.safeParse(value).data ?? "DEFAULT";
}

export function inferDataroomViewerLayoutPreset(
  input: any,
): DataroomViewerLayoutPreset {
  if (input?.viewerHeaderStyle === "NOTION") return "NOTION";
  if (input?.viewerHeaderStyle === "SPLIT") return "MODERN";
  if (input?.cardLayout === "COMPACT" || input?.showFolderTree === false) {
    return "STRICT";
  }
  return "STANDARD";
}

export const CARD_LAYOUT_OPTIONS: Array<{
  value: DataroomCardLayout;
  label: string;
}> = [
  { value: "LIST", label: "List" },
  { value: "GRID", label: "Grid" },
  { value: "COMPACT", label: "Compact" },
];

export interface ResolvedPublicLinkMeta {
  enableCustomMetatag: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaImage: string | null;
  metaFavicon: string | null;
}

type PublicLinkMetaInput = {
  link?: Record<string, any> | null;
  teamBrand?: Record<string, any> | null;
  dataroomBrand?: Record<string, any> | null;
  defaultTitle?: string;
};

export function resolvePublicLinkMeta({
  link,
  teamBrand,
  dataroomBrand,
  defaultTitle = "Shared link | Powered by Papermark",
}: PublicLinkMetaInput): ResolvedPublicLinkMeta {
  const source = link?.enableCustomMetatag
    ? link
    : dataroomBrand?.customLinkPreviewEnabled
      ? {
          metaTitle: dataroomBrand.linkPreviewTitle,
          metaDescription: dataroomBrand.linkPreviewDescription,
          metaImage: dataroomBrand.linkPreviewImage,
          metaFavicon: dataroomBrand.linkPreviewFavicon,
        }
      : teamBrand?.customLinkPreviewEnabled
        ? {
            metaTitle: teamBrand.linkPreviewTitle,
            metaDescription: teamBrand.linkPreviewDescription,
            metaImage: teamBrand.linkPreviewImage,
            metaFavicon: teamBrand.linkPreviewFavicon,
          }
        : null;

  return {
    enableCustomMetatag: Boolean(source),
    metaTitle: source?.metaTitle || defaultTitle,
    metaDescription: source?.metaDescription || null,
    metaImage: source?.metaImage || null,
    metaFavicon: source?.metaFavicon || null,
  };
}

export function useBrandingPreviewParams(): any {
  return {
    brandLogo: "",
    hideLogo: "0",
    brandColor: "#000000",
    brandBanner: "",
    accentColor: "#000000",
    accentButtonColor: "#ffffff",
    applyAccentColorToDataroomView: "0",
    cardLayout: "LIST",
    showFolderTree: "1",
    ctaLabel: "",
    ctaUrl: "",
    welcomeMessage: "",
    viewerHeaderStyle: "DEFAULT",
    hideFolderIconsInMain: "0",
  };
}

export function useLogoTone(_source?: string): any {
  return { tone: "dark", imgProps: {} };
}

type PreviewDocument = {
  id: string;
  name: string;
  dataroomDocumentId: string;
  folderName: string | null;
  downloadOnly: boolean;
  canDownload: boolean;
  hierarchicalIndex: string | null;
  versions: Array<{
    id: string;
    type: string;
    versionNumber: number;
    hasPages: boolean;
    isVertical: boolean;
    updatedAt: Date;
    fileSize?: number | bigint | null;
  }>;
  [key: string]: any;
};

export function getDataroomPreviewDataset(): {
  folders: DataroomFolder[];
  documents: PreviewDocument[];
} {
  return { folders: [], documents: [] };
}

export const AUTO_FILL_NOT_FOUND_MESSAGE = "No public brand assets were found.";
export function autoFillHasBrandAssets(
  _result: unknown,
  _options?: unknown,
): boolean {
  return false;
}

// All EE request schemas reject input, keeping direct calls to EE routes inert.
const disabledSchema: any = z.never();
export const createChatSchema = disabledSchema;
export const sendMessageSchema = disabledSchema;
export const invitationEmailSchema = z.string().email();

const rejectEnterpriseInput = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(() => false, ENTERPRISE_FEATURE_DISABLED);

const WorkflowConditionsSchema = z.object({
  logic: z.enum(["AND", "OR"]),
  items: z.array(z.unknown()),
});
const WorkflowActionSchema = z.object({
  type: z.literal("route"),
  targetLinkId: z.string(),
  targetDocumentId: z.string().optional(),
  targetDataroomId: z.string().optional(),
});

export const AccessRequestSchema = rejectEnterpriseInput(
  z.object({ email: z.string().email(), code: z.string() }),
);
export const VerifyEmailRequestSchema = rejectEnterpriseInput(
  z.object({ email: z.string().email() }),
);
export const CreateWorkflowRequestSchema = rejectEnterpriseInput(
  z.object({
    name: z.string(),
    description: z.string().optional(),
    domain: z.string().nullish(),
    slug: z.string().nullish(),
  }),
);
export const UpdateWorkflowRequestSchema = rejectEnterpriseInput(
  z.object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
);
export const CreateWorkflowStepRequestSchema = rejectEnterpriseInput(
  z.object({
    name: z.string(),
    conditions: WorkflowConditionsSchema,
    actions: z.array(WorkflowActionSchema),
  }),
);
export const UpdateWorkflowStepRequestSchema = rejectEnterpriseInput(
  z.object({
    name: z.string().optional(),
    conditions: WorkflowConditionsSchema.optional(),
    actions: z.array(WorkflowActionSchema).optional(),
  }),
);
export const ReorderStepsRequestSchema = z
  .object({
    steps: z.array(
      z.object({ stepId: z.string(), stepOrder: z.number().int() }),
    ),
  })
  .refine(() => false, ENTERPRISE_FEATURE_DISABLED);

export type ReorderStepsRequest = z.infer<typeof ReorderStepsRequestSchema>;

export function formatZodError(error: any): any {
  return error?.issues ?? [{ message: ENTERPRISE_FEATURE_DISABLED }];
}

type WorkflowConditionValidation =
  | { valid: true; data: z.infer<typeof WorkflowConditionsSchema> }
  | { valid: false; error: string };

export function validateConditions(
  _conditions: unknown,
): WorkflowConditionValidation {
  return { valid: false, error: ENTERPRISE_FEATURE_DISABLED };
}

type WorkflowActionValidation =
  | { valid: true; data: Array<z.infer<typeof WorkflowActionSchema>> }
  | { valid: false; error: string };

export function validateActions(_actions: unknown): WorkflowActionValidation {
  return { valid: false, error: ENTERPRISE_FEATURE_DISABLED };
}

export class WorkflowEngine {
  async execute(..._args: any[]): Promise<any> {
    return { success: false, error: ENTERPRISE_FEATURE_DISABLED };
  }
}

const enterpriseDisabled = async (..._args: any[]): Promise<any> => {
  throw new Error(ENTERPRISE_FEATURE_DISABLED);
};

export const createChat = enterpriseDisabled;
export const generateChatTitle = enterpriseDisabled;
export const sendMessage = enterpriseDisabled;
export const createDataroomVectorStore = enterpriseDisabled;
export const createTeamVectorStore = enterpriseDisabled;
export const getVectorStoreInfo = enterpriseDisabled;
export const removeFileFromVectorStore = enterpriseDisabled;

export async function getFilteredDataroomDocumentIds(
  ..._args: any[]
): Promise<string[]> {
  return [];
}

export async function validateChatAccess(..._args: any[]): Promise<boolean> {
  return false;
}

export const SUPPORTED_AI_CONTENT_TYPES: string[] = [];

const inertTask = (id: string) => ({
  id,
  trigger: async (..._args: any[]) => ({ id: "enterprise-feature-disabled" }),
  batchTrigger: async (..._args: any[]) => ({
    id: "enterprise-feature-disabled",
    runs: [],
  }),
});

export const addFileToVectorStoreTask = inertTask("ai-add-file-disabled");
export const processDocumentForAITask = inertTask("ai-processing-disabled");
export const sendPauseResumeNotificationTask = inertTask(
  "pause-notification-disabled",
);
export const automaticUnpauseTask = inertTask("automatic-unpause-disabled");
export const sendDataroomTrial24hReminderEmailTask = inertTask(
  "trial-reminder-disabled",
);
export const sendDataroomTrialExpiredEmailTask = inertTask(
  "trial-expired-disabled",
);
export const sendDataroomTrialInfoEmailTask = inertTask("trial-info-disabled");
export const sendConversationMentionNotificationTask = inertTask(
  "conversation-mention-disabled",
);
export const sendConversationMessageNotificationTask = inertTask(
  "conversation-message-disabled",
);
export const sendConversationTeamMemberNotificationTask = inertTask(
  "conversation-team-disabled",
);
export const dataroomFreezeArchiveTask = inertTask("freeze-disabled");
export const convertFilesToPdfTask: any = inertTask("conversion-disabled");
export const convertKeynoteToPdfTask: any = inertTask(
  "keynote-conversion-disabled",
);

export async function reportDeniedAccessAttempt(
  ..._args: any[]
): Promise<void> {}
export async function isTeamPaused(..._args: any[]): Promise<boolean> {
  return false;
}
export async function isTeamPausedById(..._args: any[]): Promise<boolean> {
  return false;
}

export function useFreezeProgress(_options?: any): any {
  return {
    isArchiveInProgress: false,
    progress: 0,
    progressText: "",
    archiveReady: false,
    activeRun: undefined,
    completedRun: undefined,
    failedRun: undefined,
    noRunsFound: false,
    isFailed: false,
    runs: [],
  };
}

export function useUninvitedMembers(..._args: any[]): any {
  return {
    uninvitedCount: 0,
    uninvitedEmails: [],
    mutate: async () => undefined,
  };
}

export function isViewerAssigned(..._args: any[]): boolean {
  return false;
}

export const VIEWER_TOGGLE_REQUEST_LIST_EVENT = "papermark:toggle-request-list";

export function useViewerRequestList(_options?: any): any {
  return {
    enabled: false,
    data: null,
    error: undefined,
    loading: false,
    mutate: async () => undefined,
  };
}

export function useRequestListFeatureEnabled(): boolean {
  return false;
}

export function isReferralsEnabled(): boolean {
  return false;
}

export const rateLimiters: any = {
  auth: {},
  bulkLinkImport: {},
  domainVerification: {},
};

export async function checkRateLimit(..._args: any[]): Promise<any> {
  return {
    success: true,
    limit: Infinity,
    remaining: Infinity,
    reset: 0,
  };
}

export const JACKSON_PRODUCT = "papermark";

export interface FolderTemplate {
  name: string;
  subfolders?: FolderTemplate[];
}

export function getDataroomSystemPrompt(..._args: any[]): string {
  return ENTERPRISE_FEATURE_DISABLED;
}

export function getDataroomUserPrompt(..._args: any[]): string {
  return ENTERPRISE_FEATURE_DISABLED;
}

export const PREMIUM_TEAM_LIMIT = 0;
export async function getPremiumTeamEligibility(..._args: any[]): Promise<any> {
  return null;
}
export async function canCreateUnlimitedTeam(
  ..._args: any[]
): Promise<boolean> {
  return false;
}

export interface SubscriptionDiscount {
  couponId: string;
  percentOff?: number;
  amountOff?: number;
  duration: string;
  durationInMonths?: number;
  valid: boolean;
  end?: number;
}

const emptyPrice = () => ({
  amount: 0,
  amountUsd: 0,
  unitPrice: 0,
  priceIds: {
    test: { old: "", new: "" },
    production: { old: "", new: "" },
  },
});

const planSlugs: Record<string, string> = {
  Pro: "pro",
  Business: "business",
  "Data Rooms": "datarooms",
  "Data Rooms Plus": "datarooms-plus",
  "Data Rooms Premium": "datarooms-premium",
  "Data Rooms Unlimited": "datarooms-unlimited",
};

export const PLANS = Object.entries(planSlugs).map(([name, slug]) => ({
  name,
  slug,
  minQuantity: 1,
  price: { monthly: emptyPrice(), yearly: emptyPrice() },
}));

export function getPriceIdFromPlan(..._args: any[]): string {
  return "";
}

export function getQuantityFromPriceId(..._args: any[]): number {
  return 1;
}

export function isOldAccount(..._args: any[]): boolean {
  return false;
}

export async function cancelSubscription(..._args: any[]): Promise<void> {}

export function stripeInstance(..._args: any[]): never {
  throw new Error(ENTERPRISE_FEATURE_DISABLED);
}
