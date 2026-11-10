import { NextResponse } from "next/server";
import { generateCallsign } from "@/lib/leaderboard";

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  return NextResponse.json({ callsign: generateCallsign() });
}
