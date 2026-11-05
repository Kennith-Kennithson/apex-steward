
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getAdminDraftQuizIncidents } from "@/lib/google-sheets";
import { selectAdminDraftQuizIncidents } from "@/lib/incidents/quiz-selection";
import {
  startAdminQuizSession,
} from "@/lib/admin-quiz-session";

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json(
      { error: "Administrator authentication required." },
      { status: 401 }
    );
  }

  const origin = request.headers.get("origin");

  if (origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 }
    );
  }

  try {
    const incidents = await getAdminDraftQuizIncidents();
    const selected = selectAdminDraftQuizIncidents(incidents);

    const session = selected.map((incident) => ({
      incidentId: incident.id,
      driversSwapped: Math.random() < 0.5,
    }));

    await startAdminQuizSession({ incidents: session });

    const safeIncidents = selected.map((incident, index) => {
      const swapped = session[index].driversSwapped;

      return {
        id: incident.id,
        title: incident.title,
        series: incident.series,
        season: incident.season,
        event: incident.event,
        circuit: incident.circuit,
        lapNumber: incident.lapNumber,
        corner: incident.corner,
        difficulty: incident.difficulty,
        video: incident.video
          ? {
              url: incident.video.url,
              provider: incident.video.provider,
            }
          : undefined,
        driverA: swapped ? incident.driverB : incident.driverA,
        driverB: swapped ? incident.driverA : incident.driverB,
      };
    });

    return NextResponse.json({ incidents: safeIncidents });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message.includes("Not enough eligible incidents")) {
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    console.error("Admin quiz start failed:", error);

    return NextResponse.json(
      { error: "Unable to prepare the draft quiz." },
      { status: 500 }
    );
  }
}
