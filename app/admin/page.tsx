
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import AdminIncidentTable from "@/components/admin-incident-table";
import AdminLogoutButton from "@/components/admin-logout-button";

import { isAdminAuthenticated } from "@/lib/admin-session";
import {
  getIncidentOverview,
  getAdminIncidentList,
} from "@/lib/google-sheets";

export default async function AdminDashboardPage() {
  await connection();

  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  const overview = await getIncidentOverview();
  const incidents = await getAdminIncidentList();

  const stats = [
    {
      label: "Total incidents",
      value: overview.total,
      description: "In the database",
      accent: "border-l-neutral-500",
    },
    {
      label: "Published",
      value: overview.published,
      description: "Available for quizzes",
      accent: "border-l-green-500",
    },
    {
      label: "Drafts",
      value: overview.drafts,
      description: "Awaiting review",
      accent: "border-l-red-500",
    },
    {
      label: "Under review",
      value: overview.underReview,
      description: "Being checked",
      accent: "border-l-amber-500",
    },
  ];

  return (
    <main className="min-h-screen bg-[#101113] px-5 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <header className="mb-12 border-b border-neutral-800 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_#ed2939]" />
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-500">
                  Private administration
                </p>
              </div>

              <h1 className="font-[family-name:var(--font-barlow-condensed)] text-5xl font-black uppercase tracking-tight sm:text-6xl">
                APEX STEWARD <span className="text-red-500">CONTROL</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">
                Incident database management, evidence verification and
                publication control.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                  Administrator
                </p>
                <p className="mt-1 text-sm text-green-400">
                  Session active
                </p>
              </div>

              <AdminLogoutButton />
            </div>
          </div>
        </header>

        {/* ADMIN QUIZ TESTING */}
        <section className="mb-6 rounded-xl border border-amber-900/40 bg-[#1d1a13] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                Administrator testing
              </p>

              <h2 className="text-2xl font-bold">
                Test the examination
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-400">
                Run a private quiz using unpublished incidents from the database.
                These records will not be available to public players.
              </p>
            </div>

            <Link
              href="/admin/quiz"
              className="inline-flex items-center gap-3 rounded-lg border border-amber-700 bg-amber-950/40 px-6 py-4 text-sm font-bold text-amber-300 transition hover:bg-amber-900/50"
            >
              TEST DRAFT QUIZ
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="mb-12">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-red-900/40 bg-gradient-to-r from-[#271316] to-[#171214] p-6 sm:p-8">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                Database management
              </p>

              <h2 className="text-2xl font-bold">
                Add a new incident
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-400">
                Enter event information, involved drivers, official
                decisions and supporting evidence.
              </p>
            </div>

            <Link
              href="/admin/incidents/new"
              className="inline-flex items-center gap-3 rounded-lg bg-red-600 px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-red-500"
            >
              <span className="text-xl">+</span>
              ADD INCIDENT
            </Link>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="mb-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                Database status
              </p>

              <h2 className="text-2xl font-bold">
                Incident overview
              </h2>
            </div>

            <span className="hidden text-xs text-neutral-500 sm:block">
              LIVE DATABASE COUNTS
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`rounded-xl border border-neutral-800 border-l-4 ${stat.accent} bg-[#181a1e] p-6 transition hover:border-neutral-600`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral-400">
                    {stat.label}
                  </p>

                  <span className="text-xs font-bold text-neutral-600">
                    0{index + 1}
                  </span>
                </div>

                <p className="mt-5 font-[family-name:var(--font-barlow-condensed)] text-5xl font-black">
                  {stat.value}
                </p>

                <p className="mt-2 text-xs text-neutral-500">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* INCIDENT MANAGEMENT */}
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-5">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-500">
                Records and verification
              </p>

              <h2 className="text-2xl font-bold">
                Incident management
              </h2>

              <p className="mt-2 text-sm text-neutral-400">
                Open an incident to inspect its evidence, verify its
                official decision or manage publication.
              </p>
            </div>

            <span className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-400">
              {incidents.length} RECORDS
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#181a1e] p-4 sm:p-6">
            <AdminIncidentTable incidents={incidents} />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800 pt-6">
          <p className="text-xs font-bold tracking-widest text-neutral-500">
            APEX STEWARD
          </p>

          <p className="text-xs text-neutral-600">
            Version 0.1.0 · Private administrator access
          </p>
        </footer>

      </div>
    </main>
  );
}
