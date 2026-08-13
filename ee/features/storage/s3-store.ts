import { getStorageConfig } from "@/ee/features/storage/config";
import { S3Store } from "@tus/s3-store";

/** Compatibility name retained for callers; this store is single-region. */
export class MultiRegionS3Store extends S3Store {
  constructor() {
    const config = getStorageConfig();

    super({
      partSize: 8 * 1024 * 1024,
      s3ClientConfig: {
        bucket: config.bucket,
        region: config.region,
        ...(config.endpoint
          ? { endpoint: config.endpoint, forcePathStyle: true }
          : {}),
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      },
    });
  }
}
