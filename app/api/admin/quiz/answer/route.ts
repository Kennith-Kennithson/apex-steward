
import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-session";
import { getAdminQuizSession } from "@/lib/admin-quiz-session";
import { getAdminIncidentById } from "@/lib/google-sheets";

import type { PenaltyType } from "@/lib/incidents/types";

const validResponsibilities = [
  "driver-a",
  "driver-b",
  "racing-incident",
] as const;

const validPenalties: PenaltyType[] = [
  "no-further-action",
  "warning",
  "reprimand",
  "time-penalty",
  "drive-through",
  "stop-and-go",
  "grid-penalty",
  "championship-points",
  "disqualification",
  "other",
];

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
    const body = await request.json();

    const {
      incidentId,
      responsibility,
      penalty,
    } = body;

    if (
      typeof incidentId !== "string" ||
      !validResponsibilities.includes(responsibility) ||
      !validPenalties.includes(penalty)
    ) {
      return NextResponse.json(
        { error: "Invalid answer submission." },
        { status: 400 }
      );
    }

    const session = await getAdminQuizSession();

    if (!session) {
      return NextResponse.json(
        { error: "Your test examination has expired. Please start again." },
        { status: 401 }
      );
    }

    const sessionIncident = session.incidents.find(
      (item) => item.incidentId === incidentId
    );

    if (!sessionIncident) {
      return NextResponse.json(
        { error: "This incident is not part of your examination." },
        { status: 403 }
      );
    }

    const incident = await getAdminIncidentById(incidentId);

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found." },
        { status: 404 }
      );
    }

    // Convert the displayed A/B answer back to the database's
    // original driver A/B identity.
    let originalResponsibility = responsibility;

    if (
      responsibility === "driver-a" ||
      responsibility === "driver-b"
    ) {
      if (sessionIncident.driversSwapped) {
        originalResponsibility =
          responsibility === "driver-a" ? "driver-b" : "driver-a";
      }
    }

    const decision = incident.officialDecision;

    const responsibilityScorable =
      decision.responsibilityIsScorable &&
      decision.responsibility !== "not-determined";

    const responsibilityCorrect = responsibilityScorable
      ? originalResponsibility === decision.responsibility
      : null;

    const penaltyCorrect = penalty === decision.penalty;

    // Convert the official finding into the displayed A/B order
    // before sending it to the browser.
    let displayedOfficialResponsibility = decision.responsibility;

    if (
      sessionIncident.driversSwapped &&
      (decision.responsibility === "driver-a" ||
        decision.responsibility === "driver-b")
    ) {
      displayedOfficialResponsibility =
        decision.responsibility === "driver-a"
          ? "driver-b"
          : "driver-a";
    }

    return NextResponse.json({
      result: {
        responsibilityCorrect,
        penaltyCorrect,
        responsibilityScorable,
        officialResponsibility: displayedOfficialResponsibility,
        officialPenalty: decision.penalty,
        penaltyDetails: decision.penaltyDetails ?? null,
        explanation: decision.explanation,
        sources: incident.sources.map((source) => ({
          title: source.title,
          publisher: source.publisher,
          url: source.url,
        })),
      },
    });
  } catch (error) {
    console.error("Admin quiz answer check failed:", error);

    return NextResponse.json(
      { error: "Unable to check this answer." },
      { status: 500 }
    );
  }
}
