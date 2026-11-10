import { NextResponse } from "next/server";
import { getPublishedIncidents } from "@/lib/google-sheets";
import { getPublicQuizSession, updatePublicQuizSession } from "@/lib/public-quiz-session";
import { calculateIncidentScore, publicOutcomeForPenalty } from "@/lib/quiz-scoring";

const validResponsibilities = ["driver-a", "driver-b", "racing-incident"] as const;
const validOutcomes = ["no-further-action", "penalty", "disqualified"] as const;

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

    const selectedResponsibility = responsibility as (typeof validResponsibilities)[number];
    const selectedOutcome = outcome as (typeof validOutcomes)[number];

    const session = await getPublicQuizSession();
    if (!session) {
      return NextResponse.json({ error: "Your examination has expired. Please start again." }, { status: 401 });
    }
    const sessionIncident = session.incidents.find((item) => item.incidentId === incidentId);
    if (!sessionIncident) {
      return NextResponse.json({ error: "This incident is not part of your examination." }, { status: 403 });
    }
    if (session.answers.some((answer) => answer.incidentId === incidentId)) {
      return NextResponse.json({ error: "An answer has already been submitted for this incident." }, { status: 409 });
    }

    const published = await getPublishedIncidents();
    const incident = published.find((item) => item.id === incidentId);
    if (!incident) {
      return NextResponse.json({ error: "This incident is no longer available." }, { status: 404 });
    }

    let originalResponsibility: (typeof validResponsibilities)[number] = selectedResponsibility;
    if (sessionIncident.driversSwapped && (responsibility === "driver-a" || responsibility === "driver-b")) {
      originalResponsibility = responsibility === "driver-a" ? "driver-b" : "driver-a";
    }

    const decision = incident.officialDecision;
    const responsibilityCorrect =
      originalResponsibility === decision.responsibility;
    const outcomeCorrect = selectedOutcome === publicOutcomeForPenalty(decision.penalty);
    const { earnedPoints, maximumPoints } = calculateIncidentScore({
      responsibilityCorrect,
      outcomeCorrect,
    });

    let displayedOfficialResponsibility = decision.responsibility;
    if (sessionIncident.driversSwapped && (decision.responsibility === "driver-a" || decision.responsibility === "driver-b")) {
      displayedOfficialResponsibility =
        decision.responsibility === "driver-a" ? "driver-b" : "driver-a";
    }

    session.answers.push({
      incidentId,
      responsibility: selectedResponsibility,
      outcome: selectedOutcome,
      earnedPoints,
      maximumPoints,
    });
    await updatePublicQuizSession(session);

    return NextResponse.json({
      result: {
        responsibilityCorrect,
        outcomeCorrect,
        earnedPoints,
        maximumPoints,
        officialResponsibility: displayedOfficialResponsibility,
        officialPenalty: decision.penalty,
        officialOutcome: publicOutcomeForPenalty(decision.penalty),
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
