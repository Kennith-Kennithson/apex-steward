import { NextResponse } from "next/server";
import { getPublicQuizSession, clearPublicQuizSession, updatePublicQuizSession } from "@/lib/public-quiz-session";
import { getPlayerTokenHash } from "@/lib/player-identity";
import { submitLeaderboardResult } from "@/lib/leaderboard";

import { gradeForPercentage, MAX_POINTS_PER_INCIDENT } from "@/lib/quiz-scoring";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }

  try {
    const session = await getPublicQuizSession();
    if (!session) {
      return NextResponse.json({ error: "Your examination has expired. Please start again." }, { status: 401 });
    }
    const answeredIncidentIds = new Set(session.answers.map((answer) => answer.incidentId));
    const allSelectedIncidentsAnswered = session.incidents.every((incident) => answeredIncidentIds.has(incident.incidentId));
    if (session.answers.length !== 15 || answeredIncidentIds.size !== 15 || !allSelectedIncidentsAnswered) {
      console.error("Quiz completion count mismatch:", {
        answerCount: session.answers.length,
        uniqueAnswerCount: answeredIncidentIds.size,
        selectedIncidentCount: session.incidents.length,
        answeredSelectedIncidentCount: session.incidents.filter((incident) => answeredIncidentIds.has(incident.incidentId)).length,
      });
      return NextResponse.json({
        error: "Quiz progress check: " + session.answers.length + " answers saved, " +
          answeredIncidentIds.size + " unique incidents answered, " +
          session.incidents.length + " incidents selected. Please share this message with support.",
      }, { status: 409 });
    }

    const championshipPoints = session.answers.reduce((total, answer) => total + answer.earnedPoints, 0);
    const maximumPoints = session.incidents.length * MAX_POINTS_PER_INCIDENT;
    const percentage = maximumPoints > 0 ? (championshipPoints / maximumPoints) * 100 : 0;
    const grade = gradeForPercentage(percentage);
    const completedAtMs = Date.now();
    const fastestLapMs = Math.max(1, completedAtMs - session.startedAtMs);

    let leaderboardStatus: "private" | "saved" | "callsign-conflict" | "unavailable" = "private";
    if (session.leaderboardOptIn && session.callsign) {
      const playerTokenHash = await getPlayerTokenHash();
      if (!playerTokenHash) {
        return NextResponse.json({ error: "Your browser identification is unavailable. Please restart the quiz if you want to submit to the leaderboard." }, { status: 409 });
      }
      try {
        await submitLeaderboardResult({
          callsign: session.callsign,
          playerTokenHash,
          championshipPoints,
          maximumPoints,
          percentage: Number(percentage.toFixed(2)),
          grade,
          fastestLapMs,
        });
        leaderboardStatus = "saved";
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (message === "that callsign is already on the leaderboard") {
          leaderboardStatus = "callsign-conflict";
        } else {
          console.error("Leaderboard submission failed; returning quiz results anyway:", error);
          leaderboardStatus = "unavailable";
        }
      }
    }

    if (leaderboardStatus === "callsign-conflict") {
      await updatePublicQuizSession({ ...session, completedAtMs });
    } else {
      await clearPublicQuizSession();
    }

    return NextResponse.json({
      result: {
        championshipPoints,
        maximumPoints,
        percentage: Number(percentage.toFixed(2)),
        grade,
        fastestLapMs,
        leaderboardStatus,
        callsign: session.callsign,
      },
    });
  } catch (error) {
    console.error("Quiz completion failed:", error);
    return NextResponse.json({ error: "Unable to calculate or save your final result." }, { status: 503 });
  }
}
