
import { NextResponse } from "next/server";
import { verifyAdminPassphrase } from "@/lib/admin-auth";
import { startAdminSession } from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    // Reject requests originating from another website.
    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;

    if (origin && origin !== requestOrigin) {
      return NextResponse.json(
        { error: "Login request rejected." },
        { status: 403 },
      );
    }

    // Read the submitted passphrase.
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("passphrase" in body) ||
      typeof body.passphrase !== "string" ||
      body.passphrase.length < 20 ||
      body.passphrase.length > 1024
    ) {
      return NextResponse.json(
        { error: "Invalid login details." },
        { status: 400 },
      );
    }

    // Verify the passphrase.
    const isValid = verifyAdminPassphrase(body.passphrase);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid passphrase." },
        { status: 401 },
      );
    }

    // Create the secure admin session.
    await startAdminSession();

    return NextResponse.json(
      { success: true },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to process login." },
      { status: 500 },
    );
  }
}
