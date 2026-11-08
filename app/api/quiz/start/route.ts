import { NextResponse } from "next/server";
import { getPublishedIncidents } from "@/lib/google-sheets";
import { selectQuizIncidents } from "@/lib/incidents/quiz-selection";
import { startPublicQuizSession } from "@/lib/public-quiz-session";
import { isCallsignAvailableForPlayer } from "@/lib/leaderboard";
import { createOrReadPlayerToken, getPlayerTokenHash } from "@/lib/player-identity";

function validCallsign(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{3,16}$/.test(value);
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid player details." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const mode = input.mode;
    const callsign = input.callsign;
    const leaderboardOptIn = input.leaderboardOptIn === true;

    if (!["custom", "random", "private"].includes(String(mode))) {
      return NextResponse.json({ error: "Choose a valid player mode." }, { status: 400 });
    }
    if (mode === "private" && leaderboardOptIn) {
      return NextResponse.json({ error: "Private play cannot enter the leaderboard." }, { status: 400 });
    }
    if (mode !== "private" && !validCallsign(callsign)) {
      return NextResponse.json({ error: "Use a callsign of 3–16 letters, numbers, underscores or hyphens." }, { status: 400 });
    }

    if (mode !== "private" && validCallsign(callsign)) {
      if (leaderboardOptIn) await createOrReadPlayerToken();
      const playerTokenHash = await getPlayerTokenHash();
      if (!(await isCallsignAvailableForPlayer(callsign, playerTokenHash))) {
        return NextResponse.json({ error: "That callsign is already on the leaderboard. Please choose another." }, { status: 409 });
      }
    }

    const incidents = await getPublishedIncidents();
    const selected = selectQuizIncidents(incidents);
    const sessionIncidents = selected.map((incident) => ({
      incidentId: incident.id,
      driversSwapped: Math.random() < 0.5,
    }));

    await startPublicQuizSession({
      incidents: sessionIncidents,
      submittedIncidentIds: [],
      answers: [],
      startedAtMs: Date.now(),
      callsign: mode === "private" ? null : callsign as string,
      leaderboardOptIn,
    });

    const safeIncidents = selected.map((incident, index) => {
      const swapped = sessionIncidents[index].driversSwapped;
      return {
        id: incident.id,
        title: incident.title,
        series: incident.series,
        season: incident.season,
        event: incident.event,
        circuit: incident.circuit,
        lapNumber: incident.lapNumber,
        corner: incident.corner,
        videoUrl: incident.video?.url,
        permanentlyMuted: incident.video?.permanentlyMuted === true,
        driverA: swapped ? incident.driverB : incident.driverA,
        driverB: swapped ? incident.driverA : incident.driverB,
      };
    });

    return NextResponse.json({ incidents: safeIncidents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Not enough eligible incidents")) {
      return NextResponse.json(
        { error: "The public quiz needs 15 published, verified incidents with eligible video." },
        { status: 400 }
      );
    }
    console.error("Public quiz start failed:", error);
    return NextResponse.json(
      { error: "Unable to prepare the public quiz." },
      { status: 500 }
    );
  }
}
