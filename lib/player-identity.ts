import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "apex_player_key";
const COOKIE_AGE = 60 * 60 * 24 * 365;

export async function createOrReadPlayerToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing && /^[a-f0-9]{64}$/i.test(existing)) return existing;

  const token = randomBytes(32).toString("hex");
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_AGE,
  });
  return token;
}

export async function getPlayerTokenHash(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}
