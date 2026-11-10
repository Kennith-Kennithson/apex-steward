"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ExamScreen, { type QuizAnswerSummary } from "@/components/exam-screen";

type PlayerMode = "custom" | "random" | "private";

interface PublicQuizIncident {
  id: string;
  title: string;
  series: string;
  season: number;
  event: string;
  circuit?: string;
  lapNumber?: number;
  corner?: string;
  videoUrl?: string;
  permanentlyMuted: boolean;
  driverA: { name: string; team?: string; carNumber?: string; carColor?: string };
  driverB: { name: string; team?: string; carNumber?: string; carColor?: string };
}

interface FinalResult {
  championshipPoints: number;
  maximumPoints: number;
  percentage: number;
  grade: string;
  fastestLapMs: number;
  leaderboardStatus: "private" | "saved" | "callsign-conflict" | "unavailable";
  callsign: string | null;
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function formatLap(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = milliseconds % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export default function QuizPage() {
  const [mode, setMode] = useState<PlayerMode>("custom");
  const [callsign, setCallsign] = useState("");
  const [randomName, setRandomName] = useState("");
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [incidents, setIncidents] = useState<PublicQuizIncident[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [answers, setAnswers] = useState<QuizAnswerSummary[]>([]);
  const [error, setError] = useState("");
  const [finishError, setFinishError] = useState("");
  const [replacementCallsign, setReplacementCallsign] = useState("");
  const [replacementSubmitting, setReplacementSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (startedAt === null || completed) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, completed]);

  async function generateCallsign() {
    setError("");
    try {
      const response = await fetch("/api/quiz/callsign");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate a callsign.");
      setRandomName(data.callsign);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to generate a callsign.");
    }
  }

  async function continueToExam() {
    setError("");
    const chosenCallsign = mode === "custom" ? callsign.trim() : randomName;

    if (mode !== "private" && !/^[a-zA-Z0-9_-]{3,16}$/.test(chosenCallsign)) {
      setError(mode === "custom"
        ? "Please use 3–16 characters. Letters, numbers, underscores and hyphens only."
        : "Please generate a callsign before continuing.");
      return;
    }
    if (leaderboardOptIn && mode === "private") {
      setError("Private play cannot enter the leaderboard.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          callsign: mode === "private" ? null : chosenCallsign,
          leaderboardOptIn: mode !== "private" && leaderboardOptIn,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to prepare your examination.");
      if (!Array.isArray(data.incidents) || data.incidents.length !== 15) {
        throw new Error("The public quiz did not return 15 incidents. Please try again later.");
      }
      setIncidents(data.incidents as PublicQuizIncident[]);
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setStartedAt(Date.now());
      setAnswers([]);
      setFinalResult(null);
      setCompleted(false);
      setFinishError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong preparing your examination.");
    } finally {
      setLoading(false);
    }
  }

  async function finishExam() {
    if (finishing) return;
    setFinishing(true);
    setFinishError("");
    try {
      const response = await fetch("/api/quiz/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to calculate your final result.");
      setFinalResult(data.result as FinalResult);
      setCompleted(true);
      setStartedAt(null);
    } catch (cause) {
      setFinishError(cause instanceof Error ? cause.message : "Unable to calculate your final result.");
    } finally {
      setFinishing(false);
    }
  }

  async function submitReplacementCallsign() {
    if (!/^[a-zA-Z0-9_-]{3,16}$/.test(replacementCallsign.trim())) {
      setFinishError("Use 3–16 characters. Letters, numbers, underscores and hyphens only.");
      return;
    }
    setReplacementSubmitting(true);
    setFinishError("");
    try {
      const response = await fetch("/api/quiz/leaderboard-resubmit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callsign: replacementCallsign.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit your result.");
      setFinalResult((previous) => previous ? {
        ...previous,
        leaderboardStatus: "saved",
        callsign: data.callsign,
      } : previous);
    } catch (cause) {
      setFinishError(cause instanceof Error ? cause.message : "Unable to submit your result.");
    } finally {
      setReplacementSubmitting(false);
    }
  }

  function changeMode(newMode: PlayerMode) {
    setMode(newMode);
    setError("");
    setLeaderboardOptIn(false);
    if (newMode === "random") {
      setRandomName("");
      void generateCallsign();
    }
  }

  function resetQuiz() {
    setIncidents([]);
    setCurrentIndex(0);
    setStartedAt(null);
    setCompleted(false);
    setElapsedSeconds(0);
    setFinalResult(null);
    setAnswers([]);
    setFinishError("");
    setError("");
  }

  const activeIncident = incidents[currentIndex];

  if (activeIncident && !completed) {
    return <>
      <SiteHeader />
      <ExamScreen
        key={activeIncident.id}
        incidentId={activeIncident.id}
        incidentNumber={currentIndex + 1}
        totalIncidents={15}
        elapsedTime={formatElapsed(elapsedSeconds)}
        incidentTitle={activeIncident.title}
        series={activeIncident.series}
        season={activeIncident.season}
        event={activeIncident.event}
        circuit={activeIncident.circuit}
        lapNumber={activeIncident.lapNumber}
        corner={activeIncident.corner}
        videoUrl={activeIncident.videoUrl}
        permanentlyMuted={activeIncident.permanentlyMuted}
        driverA={activeIncident.driverA}
        driverB={activeIncident.driverB}
        onNext={() => setCurrentIndex((index) => Math.min(index + 1, 14))}
        onFinish={finishExam}
        onAnswerResult={(summary) => setAnswers((previous) => [...previous, summary])}
      />
      {finishError && <div className="mx-auto max-w-3xl px-5 pb-8 text-sm text-red-400" role="alert">{finishError} <button className="underline" onClick={finishExam}>Try again</button></div>}
      {finishing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white"><p className="font-bold">CALCULATING CLASSIFICATION...</p></div>}
      <SiteFooter />
    </>;
  }

  if (completed && finalResult) {
    return <>
      <SiteHeader />
      <main className="quiz-setup">
        <div className="quiz-setup-inner">
          <span className="section-tag">EXAMINATION COMPLETE</span>
          <h1>THE GRID<br /><span>IS CLEAR.</span></h1>
          <p className="quiz-intro">Your final classification is confirmed. Race time: {formatLap(finalResult.fastestLapMs)}.</p>
          <div className="my-8 rounded-xl border border-white/10 bg-[#191e26] p-6 text-left">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Final classification</p>
            <p className="mt-3 text-5xl font-black text-white">{finalResult.percentage.toFixed(1)}%</p>
            <p className="mt-2 text-xl font-bold text-red-400">{finalResult.grade}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
              <div><p className="text-xs uppercase tracking-wider text-neutral-500">Championship points</p><p className="mt-1 text-2xl font-black">{finalResult.championshipPoints} / {finalResult.maximumPoints}</p></div>
              <div><p className="text-xs uppercase tracking-wider text-neutral-500">Fastest lap</p><p className="mt-1 text-2xl font-black">{formatLap(finalResult.fastestLapMs)}</p></div>
            </div>
            {finalResult.leaderboardStatus === "saved" ? (
              <p className="mt-5 text-sm text-green-400">Your best result has been submitted to the global leaderboard as {finalResult.callsign}.</p>
            ) : finalResult.leaderboardStatus === "callsign-conflict" ? (
              <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-amber-200">Your result is safe, but that callsign is already in use.</p>
                <p className="mt-2 text-xs text-neutral-300">Choose a different callsign below to submit this same result. You do not need to retake the quiz.</p>
                <label htmlFor="replacement-callsign" className="mt-4 block text-xs font-bold uppercase tracking-wider text-neutral-300">New callsign</label>
                <input id="replacement-callsign" type="text" value={replacementCallsign} onChange={(event) => setReplacementCallsign(event.target.value)} maxLength={16} placeholder="Enter a new callsign" className="mt-2 w-full rounded-md border border-white/20 bg-black/40 px-3 py-3 text-white" />
                <p className="mt-1 text-xs text-neutral-500">3–16 characters. Letters, numbers, underscores and hyphens only.</p>
                {finishError && <p className="mt-3 text-sm text-red-400" role="alert">{finishError}</p>}
                <button type="button" className="primary-button mt-4" onClick={submitReplacementCallsign} disabled={replacementSubmitting || !replacementCallsign.trim()}>
                  {replacementSubmitting ? "SUBMITTING..." : "SUBMIT MY RESULT"} <span>→</span>
                </button>
              </div>
            ) : finalResult.leaderboardStatus === "unavailable" ? (
              <p className="mt-5 text-sm text-amber-300">Your result has been calculated, but the leaderboard could not save it. Your score and incident breakdown are still available above.</p>
            ) : (
              <p className="mt-5 text-sm text-neutral-400">This was a private result and has not been added to the leaderboard.</p>
            )}
          </div>

          <div className="my-8 text-left">
            <h2 className="mb-4 text-lg font-black uppercase">Incident classification</h2>
            <div className="space-y-2">
              {answers.map((answer, index) => <div key={answer.incidentId} className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{String(index + 1).padStart(2, "0")} · {answer.incidentTitle}</p>
                  <p className="mt-1 text-xs text-neutral-400">Driver: {answer.responsibilityAnswer} · {answer.responsibilityCorrect === null ? "Not scored" : answer.responsibilityCorrect ? "Correct" : `Official: ${answer.officialResponsibility}`}</p>
                  <p className="mt-1 text-xs text-neutral-400">Outcome: {answer.outcomeAnswer} · {answer.outcomeCorrect ? "Correct" : `Official: ${answer.officialOutcome}`}</p>
                </div>
                <p className="shrink-0 font-black">{answer.earnedPoints}/{answer.maximumPoints}</p>
              </div>)}
            </div>
          </div>
          {finalResult.leaderboardStatus !== "callsign-conflict" && <a href="/leaderboard" className="secondary-button inline-flex">VIEW GLOBAL LEADERBOARD</a>}
          <button type="button" className="primary-button quiz-continue" onClick={resetQuiz}>RETURN TO START <span>→</span></button>
        </div>
      </main>
      <SiteFooter />
    </>;
  }

  return <main>
    {previewMode ? <>
      <SiteHeader />
      <ExamScreen
        incidentId="preview-incident" incidentNumber={1} totalIncidents={15} elapsedTime="00:00"
        incidentTitle="EXAMPLE INCIDENT — PREVIEW ONLY" series="F1" season={2021}
        event="Example Grand Prix" circuit="Example International Circuit" lapNumber={32} corner="Turn 4"
        driverA={{ name: "Example Driver A", team: "Example Team A", carNumber: "01", carColor: "#e10600" }}
        driverB={{ name: "Example Driver B", team: "Example Team B", carNumber: "02", carColor: "#168cff" }}
        onNext={() => {}} onFinish={() => {}}
      />
      <SiteFooter />
    </> : <>
      <SiteHeader />
      <section className="quiz-setup">
        <div className="quiz-setup-inner">
          <span className="section-tag">01 / PLAYER REGISTRATION</span>
          <h1>ENTER<br /><span>THE GRID.</span></h1>
          <p className="quiz-intro">Before the examination begins, decide how you want to appear — or whether you want to remain anonymous.</p>

          <div className="player-options">
            <button type="button" className={`player-option ${mode === "custom" ? "selected" : ""}`} onClick={() => changeMode("custom")}>
              <span className="option-number">01</span><strong>CHOOSE A CALLSIGN</strong><span>Pick your own name for the global leaderboard.</span>
            </button>
            <button type="button" className={`player-option ${mode === "random" ? "selected" : ""}`} onClick={() => changeMode("random")}>
              <span className="option-number">02</span><strong>GENERATE A CALLSIGN</strong><span>Let race control choose a motorsport-themed name.</span>
            </button>
            <button type="button" className={`player-option ${mode === "private" ? "selected" : ""}`} onClick={() => changeMode("private")}>
              <span className="option-number">03</span><strong>PRIVATE PLAY</strong><span>Take the exam without appearing on the leaderboard.</span>
            </button>
          </div>

          {mode === "custom" && <div className="callsign-panel">
            <label htmlFor="callsign">YOUR CALLSIGN</label>
            <input id="callsign" type="text" value={callsign} onChange={(event) => setCallsign(event.target.value)} placeholder="Enter your callsign" maxLength={16} />
            <small>3–16 characters. Letters, numbers, underscores and hyphens only.</small>
            <p className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/80">
              This site does not use accounts or advanced tracking. If you clear your browser data, you may lose the anonymous browser ID needed to update your leaderboard result using this callsign.
            </p>
          </div>}

          {mode === "random" && <div className="callsign-panel">
            <label>YOUR GENERATED CALLSIGN</label>
            <div className="generated-name">{randomName || "Race control is generating a name..."}</div>
            <button type="button" className="secondary-button" onClick={() => void generateCallsign()}>GENERATE ANOTHER NAME</button>
          </div>}

          {mode !== "private" && <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-left text-sm text-neutral-300">
            <input type="checkbox" checked={leaderboardOptIn} onChange={(event) => setLeaderboardOptIn(event.target.checked)} className="mt-1 h-4 w-4 accent-red-600" />
            <span><strong className="block text-white">Enter the global leaderboard</strong><span className="mt-1 block text-xs text-neutral-400">Your callsign and best quiz result will be published. No account or real name is required.</span></span>
          </label>}

          {mode === "private" && <div className="callsign-panel"><strong>PRIVATE EXAMINATION</strong><p>Your result will not be submitted to the global leaderboard.</p></div>}
          {error && <p className="quiz-error">{error}</p>}

          <button type="button" className="primary-button quiz-continue" onClick={continueToExam} disabled={loading || (mode === "random" && !randomName)}>
            {loading ? "PREPARING EXAMINATION..." : "CONTINUE"} <span>→</span>
          </button>
          <button type="button" className="secondary-button" onClick={() => setPreviewMode(true)}>PREVIEW EXAM SCREEN</button>
        </div>
      </section>
      <SiteFooter />
    </>}
  </main>;
}
