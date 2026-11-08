"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ExamScreen from "@/components/exam-screen";

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
  driverA: {
    name: string;
    team?: string;
    carNumber?: string;
    carColor?: string;
  };
  driverB: {
    name: string;
    team?: string;
    carNumber?: string;
    carColor?: string;
  };
}

const callsigns = [
  "LateBraker",
  "ApexHunter",
  "SafetyCar",
  "KerbKicker",
  "PitLanePro",
  "TrackLimits",
  "FlatOut",
  "RaceControl",
  "Slipstream",
  "GridWalker",
];

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function QuizPage() {
  const [mode, setMode] = useState<PlayerMode>("custom");
  const [callsign, setCallsign] = useState("");
  const [randomName, setRandomName] = useState("");
  const [incidents, setIncidents] = useState<PublicQuizIncident[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (startedAt === null || completed) return;

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt, completed]);

  function generateCallsign() {
    const name = callsigns[Math.floor(Math.random() * callsigns.length)];
    setRandomName(name);
    setError("");
  }

  async function continueToExam() {
    setError("");

    if (mode === "custom" && !/^[a-zA-Z0-9_-]{3,16}$/.test(callsign.trim())) {
      setError("Please use 3–16 characters. Letters, numbers, underscores and hyphens only.");
      return;
    }

    if (mode === "random" && !randomName) {
      generateCallsign();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to prepare your examination.");
      }

      if (!Array.isArray(data.incidents) || data.incidents.length !== 15) {
        throw new Error("The public quiz did not return 15 incidents. Please try again later.");
      }

      setIncidents(data.incidents as PublicQuizIncident[]);
      setCurrentIndex(0);
      setElapsedSeconds(0);
      setStartedAt(Date.now());
      setCompleted(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong preparing your examination."
      );
    } finally {
      setLoading(false);
    }
  }

  function changeMode(newMode: PlayerMode) {
    setMode(newMode);
    setError("");
    if (newMode === "random") setRandomName("");
  }

  const activeIncident = incidents[currentIndex];

  if (activeIncident && !completed) {
    return (
      <>
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
          onFinish={() => setCompleted(true)}
        />
        <SiteFooter />
      </>
    );
  }

  if (completed) {
    return (
      <>
        <SiteHeader />
        <main className="quiz-setup">
          <div className="quiz-setup-inner">
            <span className="section-tag">EXAMINATION COMPLETE</span>
            <h1>
              THE GRID
              <br />
              <span>IS CLEAR.</span>
            </h1>
            <p className="quiz-intro">
              You have reviewed all 15 incidents. Your examination time was {formatElapsed(elapsedSeconds)}.
            </p>
            <button
              type="button"
              className="primary-button quiz-continue"
              onClick={() => {
                setIncidents([]);
                setCurrentIndex(0);
                setStartedAt(null);
                setCompleted(false);
                setElapsedSeconds(0);
                setError("");
              }}
            >
              RETURN TO START <span>→</span>
            </button>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <main>
      {previewMode ? (
        <>
          <SiteHeader />
          <ExamScreen
            incidentId="preview-incident"
            incidentNumber={1}
            totalIncidents={15}
            elapsedTime="00:00"
            incidentTitle="EXAMPLE INCIDENT — PREVIEW ONLY"
            series="F1"
            season={2021}
            event="Example Grand Prix"
            circuit="Example International Circuit"
            lapNumber={32}
            corner="Turn 4"
            driverA={{
              name: "Example Driver A",
              team: "Example Team A",
              carNumber: "01",
              carColor: "#e10600",
            }}
            driverB={{
              name: "Example Driver B",
              team: "Example Team B",
              carNumber: "02",
              carColor: "#168cff",
            }}
            onNext={() => {}}
            onFinish={() => {}}
          />
          <SiteFooter />
        </>
      ) : (
        <>
          <SiteHeader />
          <section className="quiz-setup">
            <div className="quiz-setup-inner">
              <span className="section-tag">01 / PLAYER REGISTRATION</span>
              <h1>
                ENTER
                <br />
                <span>THE GRID.</span>
              </h1>
              <p className="quiz-intro">
                Before the examination begins, decide how you want to appear — or whether you want to remain anonymous.
              </p>

              <div className="player-options">
                <button
                  type="button"
                  className={`player-option ${mode === "custom" ? "selected" : ""}`}
                  onClick={() => changeMode("custom")}
                >
                  <span className="option-number">01</span>
                  <strong>CHOOSE A CALLSIGN</strong>
                  <span>Pick your own name for the global leaderboard.</span>
                </button>
                <button
                  type="button"
                  className={`player-option ${mode === "random" ? "selected" : ""}`}
                  onClick={() => changeMode("random")}
                >
                  <span className="option-number">02</span>
                  <strong>GENERATE A CALLSIGN</strong>
                  <span>Let race control choose a motorsport-themed name.</span>
                </button>
                <button
                  type="button"
                  className={`player-option ${mode === "private" ? "selected" : ""}`}
                  onClick={() => changeMode("private")}
                >
                  <span className="option-number">03</span>
                  <strong>PRIVATE PLAY</strong>
                  <span>Take the exam without appearing on the leaderboard.</span>
                </button>
              </div>

              {mode === "custom" && (
                <div className="callsign-panel">
                  <label htmlFor="callsign">YOUR CALLSIGN</label>
                  <input
                    id="callsign"
                    type="text"
                    value={callsign}
                    onChange={(event) => setCallsign(event.target.value)}
                    placeholder="Enter your callsign"
                    maxLength={16}
                  />
                  <small>3–16 characters. Do not use your real name or personal information.</small>
                </div>
              )}

              {mode === "random" && (
                <div className="callsign-panel">
                  <label>YOUR GENERATED CALLSIGN</label>
                  <div className="generated-name">{randomName || "Waiting for race control..."}</div>
                  <button type="button" className="secondary-button" onClick={generateCallsign}>
                    GENERATE NAME
                  </button>
                </div>
              )}

              {mode === "private" && (
                <div className="callsign-panel">
                  <strong>PRIVATE EXAMINATION</strong>
                  <p>Your result will not be submitted to the global leaderboard.</p>
                </div>
              )}

              {error && <p className="quiz-error">{error}</p>}

              <button
                type="button"
                className="primary-button quiz-continue"
                onClick={continueToExam}
                disabled={loading}
              >
                {loading ? "PREPARING EXAMINATION..." : "CONTINUE"} <span>→</span>
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setPreviewMode(true)}
              >
                PREVIEW EXAM SCREEN
              </button>
            </div>
          </section>
          <SiteFooter />
        </>
      )}
    </main>
  );
}
