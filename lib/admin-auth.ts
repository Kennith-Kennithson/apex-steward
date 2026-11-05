import "server-only";

import {
  createHmac,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getSessionSecret(): Buffer {
  const secret = process.env.APEX_ADMIN_SESSION_SECRET;

  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error("Admin session secret is missing or invalid.");
  }

  return Buffer.from(secret, "hex");
}

export function verifyAdminPassphrase(passphrase: string): boolean {
  const storedHash = process.env.APEX_ADMIN_PASSWORD_HASH;

  if (!storedHash) {
    throw new Error("Admin password hash is not configured.");
  }

  const parts = storedHash.split(":");

  if (parts.length !== 2) {
    throw new Error("Admin password hash has an invalid format.");
  }

  const [saltHex, hashHex] = parts;

  if (
    !/^[a-f0-9]{32}$/i.test(saltHex) ||
    !/^[a-f0-9]{128}$/i.test(hashHex)
  ) {
    throw new Error("Admin password hash has an invalid format.");
  }

  const salt = Buffer.from(saltHex, "hex");
  const expectedHash = Buffer.from(hashHex, "hex");
  const actualHash = scryptSync(passphrase, salt, 64);

  return timingSafeEqual(actualHash, expectedHash);
}

export function createAdminSessionToken(): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = Buffer.from(
    JSON.stringify({
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_SECONDS,
    }),
  ).toString("base64url");

  const signature = createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(
  token: string | undefined,
): boolean {
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payload, suppliedSignature] = parts;

    const expectedSignature = createHmac(
      "sha256",
      getSessionSecret(),
    )
      .update(payload)
      .digest();

    const actualSignature = Buffer.from(
      suppliedSignature,
      "base64url",
    );

    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return false;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      issuedAt?: unknown;
      expiresAt?: unknown;
    };

    const now = Math.floor(Date.now() / 1000);

    return (
      typeof session.issuedAt === "number" &&
      typeof session.expiresAt === "number" &&
      session.issuedAt <= now &&
      session.expiresAt > now &&
      session.expiresAt - session.issuedAt === SESSION_DURATION_SECONDS
    );
  } catch {
    return false;
  }
}