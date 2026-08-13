import type { z } from "zod";

import { SELF_HOSTED_LIMITS } from "./constants";
import type { configSchema } from "./server";

export type LimitProps = z.infer<typeof configSchema> & {
  usage: { documents: number; links: number; users: number };
  dataroomUpload: boolean;
};

const limits: LimitProps = {
  ...SELF_HOSTED_LIMITS,
  users: Infinity,
  links: Infinity,
  documents: Infinity,
  domains: Infinity,
  datarooms: Infinity,
  fileSizeLimits: {
    video: Infinity,
    document: Infinity,
    image: Infinity,
    excel: Infinity,
    maxFiles: Infinity,
    maxPages: Infinity,
  },
  usage: { documents: 0, links: 0, users: 0 },
  dataroomUpload: false,
};

export function useLimits() {
  return {
    showUpgradePlanModal: false,
    limits,
    canAddDocuments: true,
    canAddLinks: true,
    canAddUsers: true,
    isPaused: false,
    error: undefined,
    loading: false,
  };
}
