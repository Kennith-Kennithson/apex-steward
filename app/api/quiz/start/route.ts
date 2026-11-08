import { NextResponse } from "next/server";
import { getPublishedIncidents } from "@/lib/google-sheets";
import { selectQuizIncidents } from "@/lib/incidents/quiz-selection";
import { startPublicQuizSession } from "@/lib/public-quiz-session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }

  try {
    const incidents = await getPublishedIncidents();
    const selected = selectQuizIncidents(incidents);

    const session = selected.map((incident) => ({
      incidentId: incident.id,
      driversSwapped: Math.random() < 0.5,
    }));

    await startPublicQuizSession({
      incidents: session,
      submittedIncidentIds: [],
    });

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
