import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const COOKIE_NAME = "apex_public_quiz";
const SESSION_DURATION_SECONDS = 2 * 60 * 60;

export interface PublicQuizSession {
  incidents: {
    incidentId: string;
    driversSwapped: boolean;
  }[];
  answers: {
    incidentId: string;
    responsibility: "driver-a" | "driver-b" | "racing-incident";
    outcome: "no-further-action" | "penalty" | "disqualified";
    earnedPoints: number;
    maximumPoints: number;
  }[];
  startedAtMs: number;
  completedAtMs?: number;
  callsign: string | null;
  leaderboardOptIn: boolean;
}

function getEncryptionKey(): Buffer {
  const secret = process.env.APEX_ADMIN_SESSION_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error("Quiz session encryption is not configured.");
  }
  return Buffer.from(secret, "hex");
}

function encryptSession(session: PublicQuizSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(deflateRawSync(Buffer.from(JSON.stringify(session), "utf8"))),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function decryptSession(value: string): PublicQuizSession | null {
  try {
    const data = Buffer.from(value, "base64url");
    if (data.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const decrypted = Buffer.concat([
      decipher.update(data.subarray(28)),
      decipher.final(),
    ]);
    const session = JSON.parse(inflateRawSync(decrypted).toString("utf8")) as PublicQuizSession;
    if (
      !Array.isArray(session.incidents) ||
      session.incidents.length !== 15 ||
      !session.incidents.every((item) =>
        typeof item.incidentId === "string" && typeof item.driversSwapped === "boolean"
      ) ||
      !Array.isArray(session.answers) ||
      !session.answers.every((answer) =>
        answer && typeof answer.incidentId === "string" &&
        ["driver-a", "driver-b", "racing-incident"].includes(answer.responsibility) &&
        ["no-further-action", "penalty", "disqualified"].includes(answer.outcome) &&
        Number.isSafeInteger(answer.earnedPoints) && Number.isSafeInteger(answer.maximumPoints)
      ) ||
      !Number.isSafeInteger(session.startedAtMs) ||
      (session.completedAtMs !== undefined && !Number.isSafeInteger(session.completedAtMs)) ||
      typeof session.leaderboardOptIn !== "boolean" ||
      !(session.callsign === null || typeof session.callsign === "string")
    ) return null;
    return session;
  } catch {
    return null;
  }
}

export async function startPublicQuizSession(session: PublicQuizSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encryptSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getPublicQuizSession(): Promise<PublicQuizSession | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value ? decryptSession(value) : null;
}

export async function updatePublicQuizSession(session: PublicQuizSession): Promise<void> {
  await startPublicQuizSession(session);
}

export async function clearPublicQuizSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
