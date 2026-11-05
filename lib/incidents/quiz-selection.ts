
import type { Incident } from "./types";
import { isPlayableIncident } from "./incident-library";

export const QUIZ_LENGTH = 15;

export class InsufficientIncidentsError extends Error {
  constructor(available: number) {
    super(
      `Not enough eligible incidents to start a quiz. ${available} available; ${QUIZ_LENGTH} required.`
    );
    this.name = "InsufficientIncidentsError";
  }
}

// Randomly shuffle a list without changing the original.
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Select a balanced set for the public quiz.
export function selectQuizIncidents(
  incidents: Incident[]
): Incident[] {
  const playable = incidents.filter(isPlayableIncident);

  if (playable.length < QUIZ_LENGTH) {
    throw new InsufficientIncidentsError(playable.length);
  }

  const difficulties = [
    "beginner",
    "intermediate",
    "advanced",
  ] as const;

  const groups = difficulties.map((difficulty) =>
    shuffle(
      playable.filter(
        (incident) => incident.difficulty === difficulty
      )
    )
  );

  const selected: Incident[] = [];
  let round = 0;

  while (selected.length < QUIZ_LENGTH) {
    let addedThisRound = false;

    for (const group of groups) {
      if (group[round] && selected.length < QUIZ_LENGTH) {
        selected.push(group[round]);
        addedThisRound = true;
      }
    }

    if (!addedThisRound) break;
    round++;
  }

  return shuffle(selected);
}


export function selectAdminDraftQuizIncidents(
  incidents: Incident[]
): Incident[] {
  const difficulties = [
    "beginner",
    "intermediate",
    "advanced",
  ] as const;

  // Shuffle each difficulty group independently.
  const groups = difficulties.map((difficulty) =>
    shuffle(
      incidents.filter(
        (incident) => incident.difficulty === difficulty
      )
    )
  );

  const available = groups.reduce(
    (total, group) => total + group.length,
    0
  );

  if (available < QUIZ_LENGTH) {
    throw new InsufficientIncidentsError(available);
  }

  // Fill the quiz in difficulty order.
  // Beginners first, then intermediate, then advanced.
  const selected: Incident[] = [];

  for (const group of groups) {
    for (const incident of group) {
      if (selected.length >= QUIZ_LENGTH) break;
      selected.push(incident);
    }

    if (selected.length >= QUIZ_LENGTH) break;
  }

  return selected;
}

