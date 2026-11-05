"use client";

import { useState } from "react";
import ExamScreen from "@/components/exam-screen";

interface QuizIncident {
  id: string;
  title: string;
  series: string;
  season: number;
  event: string;
  circuit?: string;
  lapNumber?: number;
  corner?: string;
  video?: {
    url: string;
    provider: string;
  };
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

export default function AdminQuizLauncher() {
  const [incidents, setIncidents] = useState<QuizIncident[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);

  async function startQuiz() {
    setLoading(true);
    setError("");
    setIncidents([]);
    setCurrentIndex(0);
    setFinished(false);

    try {
      const response = await fetch("/api/admin/quiz/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to prepare the draft examination."
        );
      }

      setIncidents(data.incidents);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong preparing the examination."
      );
    } finally {
      setLoading(false);
    }
  }

  function nextIncident() {
    if (currentIndex < incidents.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      setFinished(true);
    }
  }

  const currentIncident = incidents[currentIndex];

  if (finished) {
    return (
      <section className="rounded-xl border border-green-900/40 bg-[#151a16] p-6 sm:p-8">
        <p className="mb-2 text-sm font-bold tracking-widest text-green-400">
          EXAMINATION COMPLETE
        </p>

        <h2 className="mb-3 text-2xl font-black text-white">
          All incidents reviewed.
        </h2>

        <p className="mb-6 text-sm text-gray-400">
          You have completed all {incidents.length} incidents in this private
          draft examination.
        </p>

        <button
          type="button"
          onClick={startQuiz}
          disabled={loading}
          className="rounded-md bg-red-600 px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "PREPARING..." : "START ANOTHER EXAMINATION"}
        </button>
      </section>
    );
  }

  if (currentIncident) {
    return (
      <ExamScreen
        key={currentIncident.id}
        incidentId={currentIncident.id}
        incidentNumber={currentIndex + 1}
        totalIncidents={incidents.length}
        elapsedTime="00:00"
        incidentTitle={currentIncident.title}
        series={currentIncident.series}
        season={currentIncident.season}
        event={currentIncident.event}
        circuit={currentIncident.circuit}
        lapNumber={currentIncident.lapNumber}
        corner={currentIncident.corner}
        videoUrl={currentIncident.video?.url}
        driverA={currentIncident.driverA}
        driverB={currentIncident.driverB}
        onNext={nextIncident}
        onFinish={() => setFinished(true)}
      />
    );
  }

  return (
    <section className="rounded-xl border border-amber-900/40 bg-[#1d1a13] p-6 sm:p-8">
      <p className="mb-2 text-sm font-bold tracking-widest text-amber-400">
        ADMINISTRATOR TESTING
      </p>

      <h2 className="mb-3 text-2xl font-black text-white">
        Test the examination
      </h2>

      <p className="mb-6 text-sm leading-relaxed text-gray-400">
        Generate a private examination using unpublished incidents from the
        database. Your answers will reveal the recorded official decisions
        after each submission.
      </p>

      <button
        type="button"
        onClick={startQuiz}
        disabled={loading}
        className="rounded-md bg-red-600 px-6 py-3 text-sm font-bold tracking-wide text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "PREPARING EXAMINATION..." : "GENERATE 15 INCIDENTS"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}