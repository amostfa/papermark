/**
 * Single-region storage configuration for self-hosted deployments.
 *
 * The upstream EE implementation selects a region per team. Self-hosting uses
 * one S3 or S3-compatible target, so the team-aware function intentionally
 * returns the same configuration for every team.
 */
export interface StorageConfig {
  bucket: string;
  advancedBucket?: string;
  archiveBucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  distributionHost?: string;
  advancedDistributionHost?: string;
  distributionKeyId?: string;
  distributionKeyContents?: string;
  lambdaFunctionName?: string;
}

export type StorageRegion = string;

export function getStorageConfig(_storageRegion?: string): StorageConfig {
  const bucket =
    process.env.NEXT_PRIVATE_UPLOAD_BUCKET || "papermark-unconfigured";

  return {
    bucket,
    advancedBucket: process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_BUCKET,
    archiveBucket: process.env.NEXT_PRIVATE_ARCHIVE_BUCKET || bucket,
    region: process.env.NEXT_PRIVATE_UPLOAD_REGION || "us-east-1",
    accessKeyId: process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY || "",
    endpoint: process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT,
    distributionHost:
      process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_HOST ||
      process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_DOMAIN,
    advancedDistributionHost:
      process.env.NEXT_PRIVATE_ADVANCED_UPLOAD_DISTRIBUTION_HOST,
    distributionKeyId: process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_ID,
    distributionKeyContents:
      process.env.NEXT_PRIVATE_UPLOAD_DISTRIBUTION_KEY_CONTENTS,
    lambdaFunctionName: process.env.NEXT_PRIVATE_LAMBDA_FUNCTION_NAME,
  };
}

export async function getTeamStorageConfigById(
  _teamId: string,
): Promise<StorageConfig> {
  return getStorageConfig();
}
