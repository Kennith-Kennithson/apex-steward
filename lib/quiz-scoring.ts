import type { PenaltyType } from "@/lib/incidents/types";

export type PublicQuizOutcome = "no-further-action" | "penalty" | "disqualified";

export function publicOutcomeForPenalty(penalty: PenaltyType): PublicQuizOutcome {
  if (penalty === "no-further-action") return "no-further-action";
  if (penalty === "disqualification") return "disqualified";
  return "penalty";
}

export function calculateIncidentScore(input: {
  responsibilityScorable: boolean;
  responsibilityCorrect: boolean | null;
  outcomeCorrect: boolean;
}) {
  const responsibilityPoints =
    input.responsibilityScorable && input.responsibilityCorrect === true ? 15 : 0;
  const outcomePoints = input.outcomeCorrect ? 10 : 0;
  return {
    earnedPoints: responsibilityPoints + outcomePoints,
    maximumPoints: (input.responsibilityScorable ? 15 : 0) + 10,
  };
}

export function gradeForPercentage(percentage: number): string {
  const whole = Math.floor(percentage);
  if (whole >= 91) return "F1 Race Director";
  if (whole >= 81) return "Head F1 Steward";
  if (whole >= 71) return "Junior F1 Steward";
  if (whole >= 61) return "Weekend Steward";
  if (whole >= 51) return "Head Go-Karts Steward";
  if (whole >= 41) return "Junior Go-Karts Steward";
  return "Wouldn't be trusted on the local family karts track";
}
