import "server-only";

import { cookies } from "next/headers";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

const COOKIE_NAME = "apex_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export async function startAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = createAdminSessionToken();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  return verifyAdminSessionToken(token);
}

export async function endAdminSession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}