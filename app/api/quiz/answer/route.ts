import { NextResponse } from "next/server";
import { getPublishedIncidents } from "@/lib/google-sheets";
import { getPublicQuizSession, updatePublicQuizSession } from "@/lib/public-quiz-session";
import type { PenaltyType } from "@/lib/incidents/types";

const validResponsibilities = ["driver-a", "driver-b", "racing-incident"] as const;
const validOutcomes = ["no-further-action", "penalty", "disqualified"] as const;

function publicOutcome(penalty: PenaltyType): (typeof validOutcomes)[number] {
  if (penalty === "no-further-action") return "no-further-action";
  if (penalty === "disqualification") return "disqualified";
  return "penalty";
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "JSON content is required." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 8_000) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid answer submission." }, { status: 400 });
    }
    const { incidentId, responsibility, outcome } = body as Record<string, unknown>;
    if (
      typeof incidentId !== "string" ||
      !validResponsibilities.includes(responsibility as (typeof validResponsibilities)[number]) ||
      !validOutcomes.includes(outcome as (typeof validOutcomes)[number])
    ) {
      return NextResponse.json({ error: "Invalid answer submission." }, { status: 400 });
    }

    const session = await getPublicQuizSession();
    if (!session) {
      return NextResponse.json({ error: "Your examination has expired. Please start again." }, { status: 401 });
    }
    const sessionIncident = session.incidents.find((item) => item.incidentId === incidentId);
    if (!sessionIncident) {
      return NextResponse.json({ error: "This incident is not part of your examination." }, { status: 403 });
    }
    if (session.submittedIncidentIds.includes(incidentId)) {
      return NextResponse.json({ error: "An answer has already been submitted for this incident." }, { status: 409 });
    }

    const published = await getPublishedIncidents();
    const incident = published.find((item) => item.id === incidentId);
    if (!incident) {
      return NextResponse.json({ error: "This incident is no longer available." }, { status: 404 });
    }

    let originalResponsibility = responsibility;
    if (sessionIncident.driversSwapped && (responsibility === "driver-a" || responsibility === "driver-b")) {
      originalResponsibility = responsibility === "driver-a" ? "driver-b" : "driver-a";
    }

    const decision = incident.officialDecision;
    const responsibilityScorable =
      decision.responsibilityIsScorable && decision.responsibility !== "not-determined";
    const responsibilityCorrect = responsibilityScorable
      ? originalResponsibility === decision.responsibility
      : null;
    const outcomeCorrect = outcome === publicOutcome(decision.penalty);
    const earnedPoints =
      (responsibilityScorable && responsibilityCorrect ? 15 : 0) +
      (outcomeCorrect ? 10 : 0);
    const maximumPoints = (responsibilityScorable ? 15 : 0) + 10;

    let displayedOfficialResponsibility = decision.responsibility;
    if (sessionIncident.driversSwapped && (decision.responsibility === "driver-a" || decision.responsibility === "driver-b")) {
      displayedOfficialResponsibility =
        decision.responsibility === "driver-a" ? "driver-b" : "driver-a";
    }

    session.submittedIncidentIds.push(incidentId);
    session.answers.push({
      incidentId,
      responsibility,
      outcome,
      earnedPoints,
      maximumPoints,
    });
    await updatePublicQuizSession(session);

    return NextResponse.json({
      result: {
        responsibilityCorrect,
        outcomeCorrect,
        responsibilityScorable,
        earnedPoints,
        maximumPoints,
        officialResponsibility: displayedOfficialResponsibility,
        officialPenalty: decision.penalty,
        officialOutcome: publicOutcome(decision.penalty),
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
    console.error("Public quiz answer check failed:", error);
    return NextResponse.json({ error: "Unable to check this answer." }, { status: 400 });
  }
}
