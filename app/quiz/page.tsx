
"use client";

import { useState } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { incidentLibrary } from "@/lib/incidents/incident-library";
import {
  selectQuizIncidents,
  InsufficientIncidentsError,
} from "@/lib/incidents/quiz-selection";
import type { Incident } from "@/lib/incidents/types";
import ExamScreen from "@/components/exam-screen";

type PlayerMode = "custom" | "random" | "private";

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

export default function QuizPage() {
  const [mode, setMode] = useState<PlayerMode>("custom");
  const [callsign, setCallsign] = useState("");
  const [randomName, setRandomName] = useState("");
  const [ready, setReady] = useState(false);
  const [selectedIncidents, setSelectedIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  function generateCallsign() {
    const name = callsigns[Math.floor(Math.random() * callsigns.length)];
    setRandomName(name);
    setReady(false);
    setError("");
  }

 function continueToExam() {
  setError("");
  setReady(false);
  setSelectedIncidents([]);
    setPreviewMode(false);

  if (mode === "custom") {
    const cleanedName = callsign.trim();

    if (!/^[a-zA-Z0-9_-]{3,16}$/.test(cleanedName)) {
      setError(
        "Please use 3–16 characters. Letters, numbers, underscores and hyphens only."
      );
      return;
    }
  }

  if (mode === "random" && !randomName) {
    generateCallsign();
    return;
  }

  try {
    const selected = selectQuizIncidents(incidentLibrary);

    setSelectedIncidents(selected);
    setReady(true);
  } catch (error) {
    if (error instanceof InsufficientIncidentsError) {
      setError(
        "The examination is not ready yet. We need at least 15 verified incidents with cleared video permissions before you can start."
      );
    } else {
      setError("Something went wrong preparing your examination.");
    }
  }
}

  function changeMode(newMode: PlayerMode) {
    setMode(newMode);
    setReady(false);
    setError("");

    if (newMode === "random") {
      setRandomName("");
    }
  }

  const playerName =
    mode === "custom"
      ? callsign.trim()
      : mode === "random"
        ? randomName
        : "Private player";

  return (
    <main>
      {previewMode ? (
        <>
          <SiteHeader />
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
          <SiteFooter />
        </>
      ) : (
        <>
          <SiteHeader />

          <section className="quiz-setup"></section>

      <section className="quiz-setup">
        <div className="quiz-setup-inner">
          <span className="section-tag">01 / PLAYER REGISTRATION</span>

          <h1>
            ENTER
            <br />
            <span>THE GRID.</span>
          </h1>

          <p className="quiz-intro">
            Before the examination begins, decide how you want
            to appear — or whether you want to remain anonymous.
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
                onChange={(event) => {
                  setCallsign(event.target.value);
                  setReady(false);
                  setError("");
                }}
                placeholder="Enter your callsign"
                maxLength={16}
              />
              <small>3–16 characters. Do not use your real name or personal information.</small>
            </div>
          )}

          {mode === "random" && (
            <div className="callsign-panel">
              <label>YOUR GENERATED CALLSIGN</label>
              <div className="generated-name">
                {randomName || "Waiting for race control..."}
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={generateCallsign}
              >
                GENERATE NAME
              </button>
            </div>
          )}

          {mode === "private" && (
            <div className="callsign-panel">
              <strong>PRIVATE EXAMINATION</strong>
              <p>
                Your result will not be submitted to the global
                leaderboard.
              </p>
            </div>
          )}

          {error && <p className="quiz-error">{error}</p>}

          <button
            type="button"
            className="primary-button quiz-continue"
            onClick={continueToExam}
          >
            CONTINUE <span>→</span>
          </button>

                    <button
            type="button"
            className="secondary-button"
            onClick={() => setPreviewMode(true)}
          >
            PREVIEW EXAM SCREEN
          </button>

          {ready && (
            <div className="setup-confirmation">
              <strong>EXAMINATION READY</strong>
              <p>
                Playing as: <strong>{playerName}</strong>
              </p>
              <p>
                {mode === "private"
                  ? "Your exam will be private."
                  : "Your selected callsign is ready."}
              </p>
              <small>
                {selectedIncidents.length} verified incidents selected. Your examination is ready for the next stage.
              </small>
            </div>
          )}
        </div>
      </section>

            <SiteFooter />
      </>
    )}
  </main>
  );
}
