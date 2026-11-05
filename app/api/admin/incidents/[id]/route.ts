
import { NextResponse } from "next/server";
import { updateAdminIncident } from "@/lib/admin-incidents";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Require a same-origin request.
    const origin = request.headers.get("origin");
    const requestOrigin = new URL(request.url).origin;

    if (!origin || origin !== requestOrigin) {
      return NextResponse.json(
        { error: "Request rejected." },
        { status: 403 }
      );
    }

    // Only accept JSON.
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "JSON content is required." },
        { status: 415 }
      );
    }

    // Reject oversized requests.
    const contentLength = Number(
      request.headers.get("content-length") ?? 0
    );

    if (contentLength > 64_000) {
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 }
      );
    }

    const bodyText = await request.text();

    if (new TextEncoder().encode(bodyText).length > 64_000) {
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 }
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON." },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    await updateAdminIncident(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update incident.";

    if (message.includes("Administrator authentication required")) {
      return NextResponse.json(
        { error: "Administrator login required." },
        { status: 401 }
      );
    }

    if (message === "Incident not found.") {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
