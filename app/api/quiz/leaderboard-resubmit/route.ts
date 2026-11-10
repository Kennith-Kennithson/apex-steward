import { NextResponse } from "next/server";
import { getPublicQuizSession, clearPublicQuizSession } from "@/lib/public-quiz-session";
import { getPlayerTokenHash } from "@/lib/player-identity";
import { submitLeaderboardResult } from "@/lib/leaderboard";
import { gradeForPercentage, MAX_POINTS_PER_INCIDENT } from "@/lib/quiz-scoring";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }

  try {
    const body: unknown = await request.json();
    const callsign = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).callsign
      : null;
    if (typeof callsign !== "string" || !/^[A-Za-z0-9_-]{3,16}$/.test(callsign.trim())) {
      return NextResponse.json({ error: "Use a callsign of 3–16 letters, numbers, underscores or hyphens." }, { status: 400 });
    }

    const session = await getPublicQuizSession();
    if (!session || !session.leaderboardOptIn) {
      return NextResponse.json({ error: "Your result is no longer available for leaderboard submission. Please contact support." }, { status: 409 });
    }

    const answeredIds = new Set(session.answers.map((answer) => answer.incidentId));
    if (session.answers.length !== 15 || answeredIds.size !== 15 ||
        !session.incidents.every((incident) => answeredIds.has(incident.incidentId))) {
      return NextResponse.json({ error: "Your completed quiz could not be verified for submission." }, { status: 409 });
    }

    const playerTokenHash = await getPlayerTokenHash();
    if (!playerTokenHash) {
      return NextResponse.json({ error: "Your browser identification is unavailable. Your result is safe, but it cannot be submitted from this browser." }, { status: 409 });
    }

    const championshipPoints = session.answers.reduce((total, answer) => total + answer.earnedPoints, 0);
    const maximumPoints = session.incidents.length * MAX_POINTS_PER_INCIDENT;
    const percentage = maximumPoints > 0 ? (championshipPoints / maximumPoints) * 100 : 0;
    const grade = gradeForPercentage(percentage);
    const fastestLapMs = Math.max(1, (session.completedAtMs ?? Date.now()) - session.startedAtMs);

    await submitLeaderboardResult({
      callsign: callsign.trim(),
      playerTokenHash,
      championshipPoints,
      maximumPoints,
      percentage: Number(percentage.toFixed(2)),
      grade,
      fastestLapMs,
    });

    await clearPublicQuizSession();
    return NextResponse.json({ callsign: callsign.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("already on the leaderboard") || message.toLowerCase().includes("different callsign")) {
      return NextResponse.json({ error: "That callsign is already on the leaderboard. Please choose another." }, { status: 409 });
    }
    console.error("Leaderboard result resubmission failed:", error);
    return NextResponse.json({ error: "Your result could not be submitted. Your score is still displayed above." }, { status: 503 });
  }
}
