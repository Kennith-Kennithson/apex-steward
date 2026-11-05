
import type { Incident } from "./types";

// All historical incidents will be stored here.
// Verified incidents with an official source can be used
// in the test quiz, even if video has not been added yet.

export const incidentLibrary: Incident[] = [];

// Check whether an incident is ready to appear in a test quiz.
export function isPlayableIncident(incident: Incident): boolean {
  const hasOfficialSource = incident.sources.some(
    (source) =>
      source.sourceType === "official-document" ||
      source.sourceType === "official-regulations"
  );

  return (
    incident.evidenceStatus === "verified" &&
    hasOfficialSource
  );
}

// Return only incidents that are ready for players.
export function getPlayableIncidents(): Incident[] {
  return incidentLibrary.filter(isPlayableIncident);
}

// Return the number of playable incidents.
export function getPlayableIncidentCount(): number {
  return getPlayableIncidents().length;
}
