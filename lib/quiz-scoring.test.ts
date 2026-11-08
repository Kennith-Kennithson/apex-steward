import { describe, expect, it } from "vitest";
import { calculateIncidentScore, gradeForPercentage, publicOutcomeForPenalty } from "@/lib/quiz-scoring";

describe("quiz scoring", () => {
  it("awards 15 points for responsibility and 10 for outcome", () => {
    expect(calculateIncidentScore({
      responsibilityCorrect: true,
      outcomeCorrect: true,
    })).toEqual({ earnedPoints: 25, maximumPoints: 25 });
  });

  it("keeps every incident worth 25 points when the responsibility answer is wrong", () => {
    expect(calculateIncidentScore({
      responsibilityCorrect: false,
      outcomeCorrect: true,
    })).toEqual({ earnedPoints: 10, maximumPoints: 25 });
  });

  it("awards the full responsibility points for a correct racing-incident finding", () => {
    expect(calculateIncidentScore({
      responsibilityCorrect: true,
      outcomeCorrect: false,
    })).toEqual({ earnedPoints: 15, maximumPoints: 25 });
  });

  it("keeps the maximum at 25 points for every possible answer combination", () => {
    for (const responsibilityCorrect of [true, false]) {
      for (const outcomeCorrect of [true, false]) {
        expect(calculateIncidentScore({
          responsibilityCorrect,
          outcomeCorrect,
        }).maximumPoints).toBe(25);
      }
    }
  });

  it("maps detailed official penalties to the three public outcomes", () => {
    expect(publicOutcomeForPenalty("no-further-action")).toBe("no-further-action");
    expect(publicOutcomeForPenalty("disqualification")).toBe("disqualified");
    expect(publicOutcomeForPenalty("time-penalty")).toBe("penalty");
    expect(publicOutcomeForPenalty("warning")).toBe("penalty");
  });

  it("applies the agreed grade boundaries without percentage gaps", () => {
    expect(gradeForPercentage(91)).toBe("F1 Race Director");
    expect(gradeForPercentage(90.99)).toBe("Head F1 Steward");
    expect(gradeForPercentage(81)).toBe("Head F1 Steward");
    expect(gradeForPercentage(71)).toBe("Junior F1 Steward");
    expect(gradeForPercentage(61)).toBe("Weekend Steward");
    expect(gradeForPercentage(51)).toBe("Head Go-Karts Steward");
    expect(gradeForPercentage(41)).toBe("Junior Go-Karts Steward");
    expect(gradeForPercentage(40.99)).toBe("Wouldn't be trusted on the local family karts track");
  });
});
