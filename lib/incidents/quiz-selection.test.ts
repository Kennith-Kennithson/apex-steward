
import { describe, it, expect } from "vitest";
import {
  selectQuizIncidents,
  InsufficientIncidentsError,
} from "./quiz-selection";
import type { Incident } from "./types";

// Create fictional incidents for testing only.
function createTestIncident(id: number): Incident {
  return {
    id: `test-incident-${id}`,
    series: "F1",
    season: 2024,
    event: `Fictional Test Grand Prix ${id}`,
    date: "2024-01-01",
    category: "collision",
    difficulty:
      id % 3 === 0
        ? "advanced"
        : id % 3 === 1
          ? "beginner"
          : "intermediate",
    driverA: { name: `Test Driver A ${id}` },
    driverB: { name: `Test Driver B ${id}` },
    title: `Fictional Test Incident ${id}`,
    summary: "A fictional incident used only for automated testing.",
    video: {
      url: "https://example.com/test-video",
      provider: "Test only",
      permission: "licensed",
    },
    officialDecision: {
      responsibility: "driver-a",
      penalty: "warning",
      explanation: "Fictional test decision.",
    },
    sources: [
      {
        title: "Fictional test source",
        publisher: "Test only",
        url: "https://example.com/test-source",
        sourceType: "official-document",
        accessedDate: "2024-01-01",
      },
    ],
    evidenceStatus: "verified",
  };
}

describe("Quiz incident selection", () => {
  it("refuses to start when fewer than 15 playable incidents exist", () => {
    expect(() => selectQuizIncidents([])).toThrow(
      InsufficientIncidentsError
    );
  });

  it("selects exactly 15 unique playable incidents", () => {
    const testIncidents = Array.from(
      { length: 20 },
      (_, index) => createTestIncident(index + 1)
    );

    const selected = selectQuizIncidents(testIncidents);

    expect(selected).toHaveLength(15);

    const uniqueIds = new Set(
      selected.map((incident) => incident.id)
    );

    expect(uniqueIds.size).toBe(15);
  });

    it("balances difficulty when enough incidents are available", () => {
    const testIncidents = Array.from(
      { length: 20 },
      (_, index) => createTestIncident(index + 1)
    );

    const selected = selectQuizIncidents(testIncidents);

    const beginnerCount = selected.filter(
      (incident) => incident.difficulty === "beginner"
    ).length;

    const intermediateCount = selected.filter(
      (incident) => incident.difficulty === "intermediate"
    ).length;

    const advancedCount = selected.filter(
      (incident) => incident.difficulty === "advanced"
    ).length;

    expect(beginnerCount).toBe(5);
    expect(intermediateCount).toBe(5);
    expect(advancedCount).toBe(5);
  });
    it("excludes unverified incidents and uncleared videos", () => {
    const testIncidents = Array.from(
      { length: 20 },
      (_, index) => createTestIncident(index + 1)
    );

    // Make incident 1 unverified.
    testIncidents[0].evidenceStatus = "draft";


// Draft incidents should be excluded, but video clearance
// is not required for the test quiz.
testIncidents[1].video!.permission = "not-cleared";

const selected = selectQuizIncidents(testIncidents);

const selectedIds = selected.map((incident) => incident.id);

expect(selected).toHaveLength(15);
expect(selectedIds).not.toContain("test-incident-1");
expect(selectedIds).toContain("test-incident-2");

  });
});
