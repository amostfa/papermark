import { z } from "zod";

import { SELF_HOSTED_LIMITS } from "./constants";

const optionalNumericLimitSchema = z
  .preprocess((value) => (value === null ? Infinity : value), z.number())
  .optional();
const requiredNumericLimitSchema = z
  .preprocess((value) => (value === null ? Infinity : value), z.number())
  .default(Infinity);

export const configSchema = z.object({
  datarooms: optionalNumericLimitSchema,
  links: requiredNumericLimitSchema,
  documents: requiredNumericLimitSchema,
  users: optionalNumericLimitSchema,
  domains: optionalNumericLimitSchema,
  customDomainOnPro: z.boolean(),
  customDomainInDataroom: z.boolean(),
  advancedLinkControlsOnPro: z.boolean().nullable(),
  watermarkOnBusiness: z.boolean().nullable().optional(),
  agreementOnBusiness: z.boolean().nullable().optional(),
  conversationsInDataroom: z.boolean().optional(),
  linkCustomFields: z.number().nullable().optional(),
  fileSizeLimits: z
    .object({
      video: optionalNumericLimitSchema,
      document: optionalNumericLimitSchema,
      image: optionalNumericLimitSchema,
      excel: optionalNumericLimitSchema,
      maxFiles: optionalNumericLimitSchema,
      maxPages: optionalNumericLimitSchema,
    })
    .optional(),
});

export async function getLimits(_input: { teamId: string; userId: string }) {
  return {
    ...SELF_HOSTED_LIMITS,
    usage: { documents: 0, links: 0, users: 0 },
  };
}
