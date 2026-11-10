import "server-only";

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

export const R2_STORAGE_LIMIT_BYTES = 10_000_000_000;

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("Cloudflare R2 is not fully configured on the server.");
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function createR2Client() {
  const config = getR2Config();

  return {
    config,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

export async function getR2StorageUsage() {
  const { config, client } = createR2Client();
  let usedBytes = 0;
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      usedBytes += object.Size ?? 0;
      objectCount += 1;
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;

    if (response.IsTruncated && !continuationToken) {
      throw new Error("Cloudflare R2 returned an incomplete storage listing.");
    }
  } while (continuationToken);

  return {
    usedBytes,
    objectCount,
    limitBytes: R2_STORAGE_LIMIT_BYTES,
    availableBytes: Math.max(0, R2_STORAGE_LIMIT_BYTES - usedBytes),
    percentUsed: (usedBytes / R2_STORAGE_LIMIT_BYTES) * 100,
  };
}
