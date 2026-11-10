"use client";

import { useState } from "react";

interface Entry {
  id: string;
  callsign: string;
  championship_points: number;
  maximum_points: number;
  percentage: number;
  grade: string;
  fastest_lap_ms: number;
  best_submitted_at: string;
}

function formatLap(milliseconds: number) {
  const secondsTotal = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(secondsTotal / 60);
  const seconds = secondsTotal % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds % 1000).padStart(3, "0")}`;
}

export default function AdminLeaderboardTable({ initialEntries }: { initialEntries: Entry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function removeEntry(entry: Entry) {
    if (!window.confirm(`Permanently delete the leaderboard entry for "${entry.callsign}"?`)) return;
    setDeleting(entry.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/leaderboard/${entry.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete entry.");
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete entry.");
    } finally {
      setDeleting(null);
    }
  }

  return <div className="overflow-x-auto">
    {error && <p role="alert" className="mb-4 rounded border border-red-800 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    <table className="w-full min-w-[850px] text-left text-sm">
      <thead className="border-b border-neutral-700 text-xs uppercase tracking-wider text-neutral-500">
        <tr><th className="p-3">Pos.</th><th className="p-3">Driver / callsign</th><th className="p-3">Championship points</th><th className="p-3">Fastest lap</th><th className="p-3">Grade</th><th className="p-3">Admin action</th></tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => <tr key={entry.id} className="border-b border-neutral-800">
          <td className="p-3 font-bold">{index + 1}</td>
          <td className="p-3 font-bold">{entry.callsign}</td>
          <td className="p-3 tabular-nums">{entry.championship_points} / {entry.maximum_points}</td>
          <td className="p-3 tabular-nums">{formatLap(entry.fastest_lap_ms)}</td>
          <td className="p-3">{entry.grade}</td>
          <td className="p-3"><button type="button" disabled={deleting === entry.id} onClick={() => void removeEntry(entry)} className="rounded border border-red-800 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-950 disabled:opacity-50">{deleting === entry.id ? "DELETING..." : "DELETE ENTRY"}</button></td>
        </tr>)}
        {entries.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-neutral-500">No leaderboard entries yet.</td></tr>}
      </tbody>
    </table>
  </div>;
}
