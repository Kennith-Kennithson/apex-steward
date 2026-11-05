
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminIncidentSummary } from "@/lib/google-sheets";

interface AdminIncidentTableProps {
  incidents: AdminIncidentSummary[];
}

export default function AdminIncidentTable({
  incidents,
}: AdminIncidentTableProps) {
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [publicationFilter, setPublicationFilter] = useState("all");

  const filteredIncidents = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSearch =
        !searchTerm ||
        incident.title.toLowerCase().includes(searchTerm) ||
        incident.id.toLowerCase().includes(searchTerm) ||
        incident.event.toLowerCase().includes(searchTerm);

      const matchesSeries =
        seriesFilter === "all" ||
        incident.series.toLowerCase() === seriesFilter;

      const matchesEvidence =
        evidenceFilter === "all" ||
        incident.evidenceStatus.toLowerCase() === evidenceFilter;

      const matchesPublication =
        publicationFilter === "all" ||
        incident.publicationStatus.toLowerCase() === publicationFilter;

      return (
        matchesSearch &&
        matchesSeries &&
        matchesEvidence &&
        matchesPublication
      );
    });
  }, [incidents, search, seriesFilter, evidenceFilter, publicationFilter]);

  const selectClass =
    "w-full rounded-lg border border-neutral-700 bg-[#11151b] px-3 py-3 text-sm text-white outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500";

  return (
    <section className="mt-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">
          Incident library
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          Search, filter, review and edit incidents stored in your database.
        </p>
      </div>

      {/* FILTERS */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="incident-search" className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
            Search incidents
          </label>
          <input
            id="incident-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Title, ID or event..."
            className={selectClass}
          />
        </div>

        <div>
          <label htmlFor="series-filter" className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
            Motorsport series
          </label>
          <select
            id="series-filter"
            value={seriesFilter}
            onChange={(event) => setSeriesFilter(event.target.value)}
            className={selectClass}
          >
            <option value="all">All series</option>
            <option value="f1">Formula 1</option>
            <option value="wec">WEC</option>
            <option value="indycar">IndyCar</option>
            <option value="nascar">NASCAR</option>
            <option value="motogp">MotoGP</option>
          </select>
        </div>

        <div>
          <label htmlFor="evidence-filter" className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
            Evidence status
          </label>
          <select
            id="evidence-filter"
            value={evidenceFilter}
            onChange={(event) => setEvidenceFilter(event.target.value)}
            className={selectClass}
          >
            <option value="all">All evidence statuses</option>
            <option value="draft">Draft</option>
            <option value="under-review">Under review</option>
            <option value="verified">Verified</option>
          </select>
        </div>

        <div>
          <label htmlFor="publication-filter" className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-400">
            Publication status
          </label>
          <select
            id="publication-filter"
            value={publicationFilter}
            onChange={(event) => setPublicationFilter(event.target.value)}
            className={selectClass}
          >
            <option value="all">All publication statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
          </select>
        </div>
      </div>

      {/* INCIDENT TABLE */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-[#202329] text-xs uppercase tracking-wider text-neutral-400">
            <tr>
              <th className="px-5 py-4 font-bold">Incident</th>
              <th className="px-4 py-4 font-bold">Series</th>
              <th className="px-4 py-4 font-bold">Season</th>
              <th className="px-4 py-4 font-bold">Event</th>
              <th className="px-4 py-4 font-bold">Evidence</th>
              <th className="px-4 py-4 font-bold">Publication</th>
              <th className="px-5 py-4 text-right font-bold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-800">
            {filteredIncidents.length > 0 ? (
              filteredIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  className="bg-[#181a1e] transition hover:bg-[#202329]"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/incidents/${encodeURIComponent(incident.id)}`}
                      className="font-semibold text-white transition hover:text-red-400"
                    >
                      {incident.title}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">
                      {incident.id}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-neutral-300">
                    {incident.series}
                  </td>

                  <td className="px-4 py-4 tabular-nums text-neutral-300">
                    {incident.season}
                  </td>

                  <td className="px-4 py-4 text-neutral-300">
                    {incident.event}
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300">
                      {incident.evidenceStatus}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span className="inline-flex rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300">
                      {incident.publicationStatus}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                   <Link
  href={`/admin/incidents/${encodeURIComponent(incident.id)}/edit`}
  aria-label={`Edit ${incident.title}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-600 px-4 py-2.5 text-xs font-bold tracking-wider text-white transition hover:border-red-500 hover:bg-red-500"
                    >
                      <span aria-hidden="true">✎</span>
                      EDIT
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="font-semibold text-neutral-300">
                    No matching incidents found.
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">
                    Try changing your search or filters.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Showing {filteredIncidents.length} of {incidents.length} incident(s).
        </p>

        <p className="text-xs text-neutral-600">
          Select EDIT to open an incident.
        </p>
      </div>
    </section>
  );
}
