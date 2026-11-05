
import "server-only";

import { randomUUID } from "node:crypto";
import { isAdminAuthenticated } from "@/lib/admin-session";
import {
  appendSheetRow,
  getAdminIncidentEditData,
  updateSheetRecord,
} from "@/lib/google-sheets";
import type {
  MotorsportSeries,
  IncidentCategory,
  Difficulty,
  ResponsibilityFinding,
  PenaltyType,
  IncidentSource,
  IncidentDriver,
  VideoPermission,
} from "@/lib/incidents/types";

const SERIES = ["F1", "WEC", "IndyCar", "NASCAR", "MotoGP"] as const;
const CATEGORIES = [
  "collision",
  "overtaking",
  "track-limits",
  "defending",
  "unsafe-release",
  "pit-lane",
  "safety-car",
  "other",
] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
const RESPONSIBILITIES = [
  "driver-a",
  "driver-b",
  "racing-incident",
  "not-determined",
] as const;
const PENALTIES = [
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
] as const;
const VIDEO_PERMISSIONS = [
  "not-cleared",
  "official-embed",
  "licensed",
  "permission-granted",
] as const;
const SOURCE_TYPES = [
  "official-document",
  "official-regulations",
  "official-video",
  "reputable-report",
] as const;

type CreateIncidentInput = {
  series: MotorsportSeries;
  season: number;
  event: string;
  date: string;
  circuit: string;
  lapNumber?: number;
  corner: string;
  category: IncidentCategory;
  difficulty: Difficulty;
  driverA: IncidentDriver;
  driverB: IncidentDriver;
  title: string;
  summary?: string;
  officialDecision: {
    responsibility: ResponsibilityFinding;
    responsibilityIsScorable: boolean;
    penalty: PenaltyType;
    penaltyDetails?: string;
    explanation: string;
  };
  sources: IncidentSource[];
  video?: {
    url: string;
    provider: string;
    permission: VideoPermission;
  };
};

function isOneOf<T extends readonly string[]>(
  value: unknown,
  choices: T,
): value is T[number] {
  return typeof value === "string" && choices.includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(
  value: unknown,
  field: string,
  maxLength = 200,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.trim().length > maxLength
  ) {
    throw new Error(`${field} is required and must be under ${maxLength} characters.`);
  }

  return value.trim();
}

function optionalText(
  value: unknown,
  field: string,
  maxLength = 200,
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requiredText(value, field, maxLength);
}

function validHttpUrl(value: unknown, field: string): string {
  const text = requiredText(value, field, 2048);

  try {
    const url = new URL(text);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error(`${field} must be a valid HTTP or HTTPS URL.`);
  }
}

function parseDriver(value: unknown, label: string): IncidentDriver {
  if (!isRecord(value)) {
    throw new Error(`${label} details are missing.`);
  }

  return {
    name: requiredText(value.name, `${label} name`, 100),
    carNumber: optionalText(value.carNumber, `${label} car number`, 10),
    team: optionalText(value.team, `${label} team`, 100),
    carColor: optionalText(value.carColor, `${label} car colour`, 50),
  };
}

function parseSource(value: unknown, index: number): IncidentSource {
  if (!isRecord(value)) {
    throw new Error(`Source ${index + 1} is invalid.`);
  }

  if (!isOneOf(value.sourceType, SOURCE_TYPES)) {
    throw new Error(`Source ${index + 1} has an invalid source type.`);
  }

  const accessedDate = requiredText(
    value.accessedDate,
    `Source ${index + 1} accessed date`,
    10,
  );

  if (!/^\d{4}-\d{2}-\d{2}$/.test(accessedDate) ||
      Number.isNaN(Date.parse(`${accessedDate}T00:00:00Z`))) {
    throw new Error(`Source ${index + 1} needs a date in YYYY-MM-DD format.`);
  }

  return {
    title: requiredText(value.title, `Source ${index + 1} title`, 200),
    publisher: requiredText(value.publisher, `Source ${index + 1} publisher`, 100),
    url: validHttpUrl(value.url, `Source ${index + 1} URL`),
    sourceType: value.sourceType,
    accessedDate,
  };
}

function parseInput(value: unknown): CreateIncidentInput {
  if (!isRecord(value)) {
    throw new Error("The incident details are invalid.");
  }

  if (!isOneOf(value.series, SERIES)) {
    throw new Error("Choose a valid motorsport series.");
  }

  if (!isOneOf(value.category, CATEGORIES)) {
    throw new Error("Choose a valid incident category.");
  }

  if (!isOneOf(value.difficulty, DIFFICULTIES)) {
    throw new Error("Choose a valid difficulty.");
  }

  if (!isRecord(value.officialDecision)) {
    throw new Error("The official decision is missing.");
  }

  const decision = value.officialDecision;

  if (!isOneOf(decision.responsibility, RESPONSIBILITIES)) {
    throw new Error("Choose a valid responsibility finding.");
  }

  if (typeof decision.responsibilityIsScorable !== "boolean") {
    throw new Error("Responsibility scorable must be true or false.");
  }

  if (
    decision.responsibility === "not-determined" &&
    decision.responsibilityIsScorable
  ) {
    throw new Error("An undetermined responsibility finding cannot be scored.");
  }

  if (!isOneOf(decision.penalty, PENALTIES)) {
    throw new Error("Choose a valid penalty.");
  }

  const season = Number(value.season);

  if (!Number.isInteger(season) || season < 1950 || season > 2100) {
    throw new Error("Enter a valid season.");
  }

  const date = requiredText(value.date, "Event date", 10);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  ) {
    throw new Error("Event date must use YYYY-MM-DD format.");
  }

  let lapNumber: number | undefined;

  if (value.lapNumber !== undefined && value.lapNumber !== null && value.lapNumber !== "") {
    lapNumber = Number(value.lapNumber);

    if (!Number.isInteger(lapNumber) || lapNumber < 1 || lapNumber > 1000) {
      throw new Error("Lap number must be a positive whole number.");
    }
  }

  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    throw new Error("Add at least one evidence source.");
  }

  if (value.sources.length > 20) {
    throw new Error("An incident cannot have more than 20 sources.");
  }

  let video: CreateIncidentInput["video"];

  if (value.video !== undefined && value.video !== null) {
    if (!isRecord(value.video)) {
      throw new Error("Video details are invalid.");
    }

    if (!isOneOf(value.video.permission, VIDEO_PERMISSIONS)) {
      throw new Error("Choose a valid video permission status.");
    }

    video = {
      url: validHttpUrl(value.video.url, "Video URL"),
      provider: requiredText(value.video.provider, "Video provider", 100),
      permission: value.video.permission,
    };
  }

  return {
    series: value.series,
    season,
    event: requiredText(value.event, "Event", 150),
    date,
    circuit: requiredText(value.circuit, "Circuit", 150),
    lapNumber,
    corner: requiredText(value.corner, "Corner or location", 100),
    category: value.category,
    difficulty: value.difficulty,
    driverA: parseDriver(value.driverA, "Driver A"),
    driverB: parseDriver(value.driverB, "Driver B"),
    title: requiredText(value.title, "Incident title", 200),
    summary: optionalText(value.summary, "Summary", 1000),
    officialDecision: {
      responsibility: decision.responsibility,
      responsibilityIsScorable: decision.responsibilityIsScorable,
      penalty: decision.penalty,
      penaltyDetails: optionalText(
        decision.penaltyDetails,
        "Penalty details",
        200,
      ),
      explanation: requiredText(
        decision.explanation,
        "Official explanation",
        2000,
      ),
    },
    sources: value.sources.map((source, index) =>
      parseSource(source, index),
    ),
    video,
  };
}

export async function createAdminIncident(
  input: unknown,
): Promise<{ incidentId: string }> {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    throw new Error("You must be logged in as an administrator.");
  }

  const incident = parseInput(input);
  const incidentId = `inc-${randomUUID()}`;
  const driverAId = `drv-${randomUUID()}`;
  const driverBId = `drv-${randomUUID()}`;
  const now = new Date().toISOString();

  // Save both drivers.
  await appendSheetRow("Drivers", [
    driverAId,
    incident.driverA.name,
    incident.driverA.carNumber ?? "",
    incident.driverA.team ?? "",
    incident.series,
    incident.season,
    incident.driverA.carColor ?? "",
    "",
  ]);

  await appendSheetRow("Drivers", [
    driverBId,
    incident.driverB.name,
    incident.driverB.carNumber ?? "",
    incident.driverB.team ?? "",
    incident.series,
    incident.season,
    incident.driverB.carColor ?? "",
    "",
  ]);

  // Save the evidence sources.
  for (const source of incident.sources) {
    await appendSheetRow("Sources", [
      `src-${randomUUID()}`,
      incidentId,
      source.title,
      source.publisher,
      source.url,
      source.sourceType,
      source.accessedDate,
      "",
    ]);
  }

  // New incidents are always drafts and unpublished.
  await appendSheetRow("Incidents", [
    incidentId,
    incident.series,
    incident.season,
    incident.event,
    incident.date,
    incident.circuit,
    incident.lapNumber ?? "",
    incident.corner,
    incident.category,
    incident.difficulty,
    driverAId,
    driverBId,
    incident.title,
    incident.officialDecision.responsibility,
    incident.officialDecision.responsibilityIsScorable,
    incident.officialDecision.penalty,
    incident.officialDecision.penaltyDetails ?? "",
    incident.officialDecision.explanation,
    "draft",
    "unpublished",
    incident.video?.url ?? "",
    incident.video?.provider ?? "",
    incident.video?.permission ?? "not-cleared",
   now,
now,
incident.summary ?? "",
]);

  // Record the creation in the audit log.
  await appendSheetRow("Change Log", [
    `chg-${randomUUID()}`,
    incidentId,
    "created",
    "admin",
    now,
    "",
    "Created as draft / unpublished",
    "Incident created through the private admin dashboard.",
  ]);

  return { incidentId };
}


export async function updateAdminIncident(
  incidentId: string,
  input: unknown
): Promise<void> {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    throw new Error("Administrator authentication required.");
  }

  if (
    typeof incidentId !== "string" ||
    !/^inc-[0-9a-f-]{36}$/i.test(incidentId)
  ) {
    throw new Error("Invalid incident ID.");
  }

  const incident = parseInput(input);
  const existing = await getAdminIncidentEditData(incidentId);

  if (!existing) {
    throw new Error("Incident not found.");
  }

  const now = new Date().toISOString();

  // Update the existing incident without changing its status or ID.
  await updateSheetRecord("Incidents", "incident_id", incidentId, {
    series: incident.series,
    season: incident.season,
    event: incident.event,
    event_date: incident.date,
    circuit: incident.circuit,
    lap_number: incident.lapNumber ?? "",
    corner: incident.corner,
    category: incident.category,
    difficulty: incident.difficulty,
    incident_title: incident.title,
    official_responsibility: incident.officialDecision.responsibility,
    responsibility_scorable:
      incident.officialDecision.responsibilityIsScorable,
    penalty_type: incident.officialDecision.penalty,
    penalty_details: incident.officialDecision.penaltyDetails ?? "",
    official_explanation: incident.officialDecision.explanation,
    video_url: incident.video?.url ?? "",
    video_provider: incident.video?.provider ?? "",
    video_permission: incident.video?.permission ?? "not-cleared",
    updated_at: now,
    summary: incident.summary ?? "",
  });

  // Update the existing driver records using their permanent IDs.
  await updateSheetRecord("Drivers", "driver_id", existing.driverAId, {
    driver_name: incident.driverA.name,
    car_number: incident.driverA.carNumber ?? "",
    team: incident.driverA.team ?? "",
    series: incident.series,
    season: incident.season,
    car_colour: incident.driverA.carColor ?? "",
  });

  await updateSheetRecord("Drivers", "driver_id", existing.driverBId, {
    driver_name: incident.driverB.name,
    car_number: incident.driverB.carNumber ?? "",
    team: incident.driverB.team ?? "",
    series: incident.series,
    season: incident.season,
    car_colour: incident.driverB.carColor ?? "",
  });

  // Update the first existing source, or add one if none exists.
  const firstSource = incident.sources[0];
  const firstSourceId = existing.sourceIds[0];

  if (firstSourceId) {
    await updateSheetRecord("Sources", "source_id", firstSourceId, {
      source_title: firstSource.title,
      publisher: firstSource.publisher,
      source_url: firstSource.url,
      source_type: firstSource.sourceType,
      accessed_date: firstSource.accessedDate,
    });
  } else {
    await appendSheetRow("Sources", [
      `src-${randomUUID()}`,
      incidentId,
      firstSource.title,
      firstSource.publisher,
      firstSource.url,
      firstSource.sourceType,
      firstSource.accessedDate,
      "",
    ]);
  }

  // Record the edit in the audit log.
  await appendSheetRow("Change Log", [
    `chg-${randomUUID()}`,
    incidentId,
    "incident-updated",
    "admin",
    now,
    "Existing incident details",
    "Updated incident details",
    "Incident edited through the private admin dashboard.",
  ]);
}

