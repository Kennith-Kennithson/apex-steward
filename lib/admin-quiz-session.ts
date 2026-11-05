
import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "apex_admin_quiz";
const SESSION_DURATION = 8 * 60 * 60;

export interface AdminQuizSession {
  incidents: {
    incidentId: string;
    driversSwapped: boolean;
  }[];
}

function getEncryptionKey(): Buffer {
  const secret = process.env.APEX_ADMIN_SESSION_SECRET;

  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error("Admin session secret is not configured correctly.");
  }

  return Buffer.from(secret, "hex");
}

function encryptSession(session: AdminQuizSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptSession(value: string): AdminQuizSession | null {
  try {
    const data = Buffer.from(value, "base64url");

    if (data.length < 29) return null;

    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);

    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      iv
    );

    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const session = JSON.parse(
      decrypted.toString("utf8")
    ) as AdminQuizSession;

    if (
      !Array.isArray(session.incidents) ||
      session.incidents.length !== 15 ||
      !session.incidents.every(
        (item) =>
          typeof item.incidentId === "string" &&
          typeof item.driversSwapped === "boolean"
      )
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function startAdminQuizSession(
  session: AdminQuizSession
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, encryptSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function getAdminQuizSession(): Promise<AdminQuizSession | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;

  return value ? decryptSession(value) : null;
}

export async function clearAdminQuizSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
