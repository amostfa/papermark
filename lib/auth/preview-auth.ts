import { z } from "zod";

import {
  createSignedSessionToken,
  parseSignedSessionToken,
} from "@/lib/auth/signed-session";

export const PREVIEW_EXPIRATION_TIME = 20 * 60 * 1000; // 20 minutes
const PREVIEW_SESSION_PURPOSE = "papermark-preview-session-v1";

const ZPreviewSessionSchema = z.object({
  userId: z.string(),
  linkId: z.string(),
  expiresAt: z.number(),
});

type PreviewSession = z.infer<typeof ZPreviewSessionSchema>;

async function createPreviewSession(
  linkId: string,
  userId: string,
): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + PREVIEW_EXPIRATION_TIME;

  const sessionData: PreviewSession = {
    linkId,
    userId,
    expiresAt,
  };

  ZPreviewSessionSchema.parse(sessionData);

  return {
    token: createSignedSessionToken(sessionData, PREVIEW_SESSION_PURPOSE),
    expiresAt,
  };
}

async function verifyPreviewSession(
  previewToken: string,
  userId: string,
  linkId: string,
): Promise<PreviewSession | null> {
  try {
    const sessionData = ZPreviewSessionSchema.parse(
      parseSignedSessionToken(previewToken, PREVIEW_SESSION_PURPOSE),
    );

    // Check if the session is for the correct user
    if (sessionData.userId !== userId) {
      return null;
    }

    // Check if session is expired
    if (sessionData.expiresAt < Date.now()) {
      return null;
    }

    // Check if the session is for the correct link and dataroom
    if (sessionData.linkId !== linkId) {
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error("Preview session verification error:", error);
    return null;
  }
}

export { createPreviewSession, verifyPreviewSession };
export type { PreviewSession };
