import { NextResponse } from "next/server";
import { generateCallsign, isCallsignAvailable } from "@/lib/leaderboard";

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  try {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const callsign = generateCallsign();
      if (await isCallsignAvailable(callsign)) {
        return NextResponse.json({ callsign });
      }
    }
    return NextResponse.json({ error: "Race control couldn't find an available callsign. Try again." }, { status: 503 });
  } catch (error) {
    console.error("Callsign generation failed:", error);
    return NextResponse.json({ error: "Callsign generation is temporarily unavailable." }, { status: 503 });
  }
}
