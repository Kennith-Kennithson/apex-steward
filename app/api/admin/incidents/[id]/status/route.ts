import { NextResponse } from "next/server";
import { updateAdminIncidentStatus } from "@/lib/google-sheets";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;

    if (!origin || origin !== requestOrigin) {
      return NextResponse.json(
        { error: "Request rejected." },
        { status: 403 }
      );
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json(
        { error: "Invalid content type." },
        { status: 415 }
      );
    }

    const contentLength = Number(
      request.headers.get("content-length") ?? 0
    );

    if (contentLength > 4096) {
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 }
      );
    }

    const rawBody = await request.text();

    if (rawBody.length > 4096) {
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 }
      );
    }

    const body: unknown = JSON.parse(rawBody);

    if (
      typeof body !== "object" ||
      body === null ||
      !("statusType" in body) ||
      !("newStatus" in body) ||
      (body.statusType !== "evidence" &&
        body.statusType !== "publication") ||
      typeof body.newStatus !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid status details." },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: "Invalid incident ID." },
        { status: 400 }
      );
    }

    await updateAdminIncidentStatus(
      id,
      body.statusType,
      body.newStatus
    );

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message.includes("Administrator authentication required")) {
      return NextResponse.json(
        { error: "Administrator login required." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: message || "Unable to update incident status." },
      { status: 400 }
    );
  }
}