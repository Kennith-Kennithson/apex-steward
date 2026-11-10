import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getR2StorageUsage, R2_STORAGE_LIMIT_BYTES } from "@/lib/cloudflare-r2";

const MAX_FILE_SIZE = 250 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function getR2Config() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, "");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error("Cloudflare R2 is not fully configured on the server.");
  }

  let parsedPublicUrl: URL;
  try {
    parsedPublicUrl = new URL(publicUrl);
  } catch {
    throw new Error("The Cloudflare R2 public URL is invalid.");
  }

  if (parsedPublicUrl.protocol !== "https:" || parsedPublicUrl.username || parsedPublicUrl.password) {
    throw new Error("The Cloudflare R2 public URL must be a valid HTTPS URL.");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
  };
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;

    if (!origin || origin !== requestOrigin) {
      return NextResponse.json({ error: "Request rejected." }, { status: 403 });
    }

    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Administrator login required." }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "JSON content is required." }, { status: 415 });
    }

    const body = (await request.json()) as {
      fileName?: unknown;
      contentType?: unknown;
      size?: unknown;
    };

    if (
      typeof body.fileName !== "string" ||
      body.fileName.length > 180 ||
      typeof body.contentType !== "string" ||
      typeof body.size !== "number" ||
      !Number.isSafeInteger(body.size) ||
      body.size <= 0 ||
      body.size > MAX_FILE_SIZE ||
      !ALLOWED_TYPES.has(body.contentType)
    ) {
      return NextResponse.json(
        { error: "Choose an MP4, WebM or QuickTime video no larger than 250 MB." },
        { status: 400 },
      );
    }

    let storageUsage;
    try {
      storageUsage = await getR2StorageUsage();
    } catch {
      return NextResponse.json(
        { error: "Unable to check Cloudflare R2 storage. Upload blocked for safety; check the R2 credentials and bucket permissions." },
        { status: 503 },
      );
    }

    if (storageUsage.usedBytes + body.size > R2_STORAGE_LIMIT_BYTES) {
      const availableMb = Math.max(0, storageUsage.availableBytes / (1024 * 1024));
      const requestedMb = body.size / (1024 * 1024);
      return NextResponse.json(
        { error: `Upload refused: R2 storage is at ${storageUsage.percentUsed.toFixed(1)}% (10 GB limit). Only ${availableMb.toFixed(1)} MB is available, but this video is ${requestedMb.toFixed(1)} MB.` },
        { status: 413 },
      );
    }

    const config = getR2Config();
    const extensionByType: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
    };
    const objectKey = `incidents/${randomUUID()}.${extensionByType[body.contentType]}`;

    const client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: body.contentType,
      }),
      { expiresIn: 300 },
    );

    return NextResponse.json({
      uploadUrl,
      objectKey,
      publicUrl: `${config.publicUrl}/${objectKey}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare video upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
