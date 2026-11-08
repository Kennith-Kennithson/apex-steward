"use client";

import { useState } from "react";
import IncidentVideoPlayer from "./incident-video-player";

interface DriverDetails {
  name: string;
  team?: string;
  carNumber?: string;
  carColor?: string;
}

interface ExamResult {
  responsibilityCorrect: boolean | null;
  outcomeCorrect: boolean;
  responsibilityScorable: boolean;
  earnedPoints: number;
  maximumPoints: number;
  officialResponsibility: string;
  officialPenalty: string;
  officialOutcome: "no-further-action" | "penalty" | "disqualified";
  penaltyDetails: string | null;
  explanation: string;
  sources: { title: string; publisher: string; url: string }[];
}

export interface QuizAnswerSummary {
  incidentId: string;
  incidentTitle: string;
  responsibilityAnswer: string;
  outcomeAnswer: string;
  earnedPoints: number;
  maximumPoints: number;
  responsibilityCorrect: boolean | null;
  outcomeCorrect: boolean;
}

interface ExamScreenProps {
  incidentId: string;
  incidentNumber: number;
  totalIncidents: number;
  elapsedTime: string;
  incidentTitle: string;
  series: string;
  season: number;
  event: string;
  circuit?: string;
  lapNumber?: number;
  corner?: string;
  videoUrl?: string;
  permanentlyMuted?: boolean;
  driverA: DriverDetails;
  driverB: DriverDetails;
  onNext: () => void;
  onFinish: () => void;
  onAnswerResult?: (summary: QuizAnswerSummary) => void;
}

function responsibilityLabel(value: string, driverAName: string, driverBName: string) {
  if (value === "driver-a") return driverAName;
  if (value === "driver-b") return driverBName;
  if (value === "racing-incident") return "Racing incident";
  if (value === "not-determined") return "Not determined";
  return value;
}

function outcomeLabel(value: string) {
  if (value === "no-further-action") return "No penalty / no further action";
  if (value === "penalty") return "Penalty";
  if (value === "disqualified") return "Disqualified";
  return value;
}

export default function ExamScreen({
  incidentId, incidentNumber, totalIncidents, elapsedTime, incidentTitle,
  series, season, event, circuit, lapNumber, corner, videoUrl,
  permanentlyMuted = false, driverA, driverB, onNext, onFinish, onAnswerResult,
}: ExamScreenProps) {
  const [responsibility, setResponsibility] = useState("");
  const [outcome, setOutcome] = useState("");
  const [result, setResult] = useState<ExamResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = responsibility !== "" && outcome !== "" && !submitting;

  async function submitVerdict() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, responsibility, outcome }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to check your verdict.");
      const checked = data.result as ExamResult;
      setResult(checked);
      onAnswerResult?.({
        incidentId,
        incidentTitle,
        responsibilityAnswer: responsibility,
        outcomeAnswer: outcome,
        earnedPoints: checked.earnedPoints,
        maximumPoints: checked.maximumPoints,
        responsibilityCorrect: checked.responsibilityCorrect,
        outcomeCorrect: checked.outcomeCorrect,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong checking your verdict.");
    } finally {
      setSubmitting(false);
    }
  }

  const responsibilityDisplay = responsibilityLabel(responsibility, driverA.name, driverB.name);

  return (
    <main className="exam-page">
      <div className="exam-topline">
        <div className="exam-progress">
          <span>INCIDENT</span>
          <strong>{String(incidentNumber).padStart(2, "0")} / {String(totalIncidents).padStart(2, "0")}</strong>
        </div>
        <div className="exam-timer">
          <span>FASTEST LAP</span>
          <strong>{elapsedTime}</strong>
        </div>
      </div>
      <div className="exam-progress-track">
        <div className="exam-progress-fill" style={{ width: `${(incidentNumber / totalIncidents) * 100}%` }} />
      </div>
      <h1 className="exam-incident-title">{incidentTitle}</h1>

      <div className="exam-layout">
        <section className="exam-video-panel">
          <div className="exam-video-placeholder">
            <IncidentVideoPlayer videoUrl={videoUrl} permanentlyMuted={permanentlyMuted} incidentId={incidentId} />
          </div>
          <div className="incident-briefing">
            <div className="briefing-heading">
              <h2>INCIDENT BRIEFING</h2>
              <span>CASE FILE {String(incidentNumber).padStart(3, "0")}</span>
            </div>
            <div className="briefing-grid">
              <div className="briefing-item"><span>CHAMPIONSHIP</span><strong>{series}</strong></div>
              <div className="briefing-item"><span>SEASON</span><strong>{season}</strong></div>
              <div className="briefing-item"><span>EVENT</span><strong>{event}</strong></div>
              {circuit && <div className="briefing-item"><span>CIRCUIT</span><strong>{circuit}</strong></div>}
              {lapNumber !== undefined && <div className="briefing-item"><span>LAP</span><strong>{lapNumber}</strong></div>}
              {corner && <div className="briefing-item"><span>LOCATION</span><strong>{corner}</strong></div>}
            </div>
          </div>
        </section>

        <section className="exam-question-panel">
          <h2>YOUR VERDICT</h2>
          <div className="exam-question">
            <h3>01 / Who was primarily responsible? <span className="text-xs text-neutral-500">15 POINTS</span></h3>
            <div className="exam-driver-options">
              {[driverA, driverB].map((driver, index) => {
                const value = index === 0 ? "driver-a" : "driver-b";
                return (
                  <button type="button" key={`${driver.name}-${index}`} disabled={!!result}
                    className={`exam-driver-option ${responsibility === value ? "selected" : ""}`}
                    onClick={() => setResponsibility(value)}>
                    <span className="exam-car-swatch" style={{ backgroundColor: driver.carColor || "#777777" }} />
                    <span className="exam-driver-info">
                      <strong>{driver.name}</strong>
                      <small>{driver.carNumber ? `#${driver.carNumber}` : ""}{driver.carNumber && driver.team ? " · " : ""}{driver.team}</small>
                    </span>
                  </button>
                );
              })}
              <button type="button" disabled={!!result}
                className={`exam-driver-option ${responsibility === "racing-incident" ? "selected" : ""}`}
                onClick={() => setResponsibility("racing-incident")}>
                <span className="exam-neutral-mark">—</span>
                <span className="exam-driver-info"><strong>Racing incident</strong><small>Neither driver primarily responsible</small></span>
              </button>
            </div>
          </div>

          <div className="exam-question">
            <h3>02 / What was the official outcome? <span className="text-xs text-neutral-500">10 POINTS</span></h3>
            <div className="exam-penalty-options">
              {[
                { value: "no-further-action", label: "No penalty / no further action" },
                { value: "penalty", label: "Penalty" },
                { value: "disqualified", label: "Disqualified" },
              ].map((option) => (
                <button type="button" key={option.value} disabled={!!result}
                  className={`exam-penalty-option ${outcome === option.value ? "selected" : ""}`}
                  onClick={() => setOutcome(option.value)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {!result && <>
            {error && <p className="quiz-error">{error}</p>}
            <button type="button" className="exam-submit" disabled={!canSubmit} onClick={submitVerdict}>
              {submitting ? "CHECKING VERDICT..." : "SUBMIT VERDICT"}
            </button>
            <p className="exam-submit-note">Select both answers before submitting.</p>
          </>}

          {result && <div className="mt-8 space-y-5 border-t border-neutral-700 pt-6">
            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Incident score</p>
              <p className="mt-1 text-3xl font-black">{result.earnedPoints} <span className="text-lg text-neutral-400">/ {result.maximumPoints} points</span></p>
            </div>
            <h2 className="text-xl font-black uppercase">STEWARDS' DECISION</h2>
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Your responsibility verdict</p>
              <p className="mt-2 font-bold">{responsibilityDisplay}</p>
              <p className="mt-1 text-sm text-neutral-400">
                {result.responsibilityScorable
                  ? result.responsibilityCorrect ? "Correct — 15 championship points." : `Official finding: ${responsibilityLabel(result.officialResponsibility, driverA.name, driverB.name)}.`
                  : "Responsibility was not scored because no definitive finding was recorded."}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Official outcome</p>
              <p className="mt-2 font-bold">{outcomeLabel(result.officialOutcome)}{result.penaltyDetails ? ` — ${result.penaltyDetails}` : ""}</p>
              <p className="mt-1 text-sm text-neutral-400">
                {result.outcomeCorrect ? "Correct — 10 championship points." : `Your prediction: ${outcomeLabel(outcome)}.`}
              </p>
              {result.officialPenalty !== "no-further-action" && <p className="mt-1 text-xs text-neutral-500">Official penalty recorded: {result.officialPenalty.replaceAll("-", " ")}.</p>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Stewards' explanation</p>
              <p className="mt-2 text-sm leading-6 text-neutral-300">{result.explanation}</p>
            </div>
            {result.sources.length > 0 && <div>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Evidence and official records</p>
              <ul className="mt-3 space-y-2">
                {result.sources.map((source, index) => <li key={`${source.url}-${index}`}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-red-400 underline hover:text-red-300">{source.title} — {source.publisher} ↗</a>
                </li>)}
              </ul>
            </div>}
            <button type="button" className="exam-submit" onClick={incidentNumber === totalIncidents ? onFinish : onNext}>
              {incidentNumber === totalIncidents ? "FINISH EXAMINATION" : "NEXT INCIDENT →"}
            </button>
          </div>}
        </section>
      </div>
    </main>
  );
}
