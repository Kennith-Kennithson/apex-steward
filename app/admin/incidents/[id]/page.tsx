import { Suspense } from "react";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-session";
import { getAdminIncidentById } from "@/lib/google-sheets";
import AdminIncidentStatusControls from "@/components/admin-incident-status-controls";

interface AdminIncidentPageProps {
  params: Promise<{ id: string }>;
}

function ExternalLink({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  let safeUrl: URL;

  try {
    safeUrl = new URL(url);
  } catch {
    return <span className="break-all text-neutral-400">{url}</span>;
  }

  if (safeUrl.protocol !== "https:" && safeUrl.protocol !== "http:") {
    return <span className="break-all text-neutral-400">{url}</span>;
  }

  return (
    <a
      href={safeUrl.toString()}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 break-all font-medium text-red-400 transition hover:text-red-300"
    >
      {title}
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const hasValue =
    children !== null &&
    children !== undefined &&
    children !== "";

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <div className="break-words text-sm font-medium leading-6 text-neutral-200">
        {hasValue ? children : <span className="text-neutral-600">Not provided</span>}
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-neutral-800 bg-[#181a1e]">
      <div className="flex items-start gap-4 border-b border-neutral-800 px-5 py-5 sm:px-7">
        <span className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-black text-red-500">
          {number}
        </span>

        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-5 text-neutral-500">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        {children}
      </div>
    </section>
  );
}

function DriverCard({
  label,
  colour,
  driver,
}: {
  label: string;
  colour: string;
  driver: {
    name: string;
    carNumber?: string;
    team?: string;
    carColor?: string;
  };
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#181a1e]">
      <div className={`h-1 ${colour}`} />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
            {label}
          </span>

          <span className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black text-neutral-700">
            {label === "Driver A" ? "A" : "B"}
          </span>
        </div>

        <h3 className="text-2xl font-bold text-white">
          {driver.name}
        </h3>

        <div className="mt-6 grid grid-cols-2 gap-5">
          <Detail label="Car number">{driver.carNumber}</Detail>
          <Detail label="Car colour">{driver.carColor}</Detail>
          <div className="col-span-2">
            <Detail label="Team">{driver.team}</Detail>
          </div>
        </div>
      </div>
    </div>
  );
}

async function AdminIncidentContent({
  params,
}: AdminIncidentPageProps) {
  await connection();

  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const incident = await getAdminIncidentById(id);

  if (!incident) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#101113] px-5 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">

        {/* NAVIGATION */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-400 transition hover:text-white"
        >
          <span aria-hidden="true">←</span>
          Back to dashboard
        </Link>

        {/* INCIDENT HEADER */}
        <header className="mb-10 mt-8 border-b border-neutral-800 pb-8">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
              Incident review
            </span>

            <span className="text-xs text-neutral-500">
              {incident.series} · {incident.season}
            </span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl font-black uppercase leading-tight sm:text-5xl">
                {incident.title}
              </h1>

              <p className="mt-4 break-all text-xs text-neutral-500">
                ID: {incident.id}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-neutral-800 bg-[#181a1e] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Evidence status
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {incident.evidenceStatus}
                </p>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-[#181a1e] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Publication status
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {incident.publicationStatus}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* EVENT INFORMATION */}
        <div className="space-y-8">

          <Section
            number="01"
            title="Event details"
            description="The race weekend and location associated with this incident."
          >
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Series">{incident.series}</Detail>
              <Detail label="Season">{incident.season}</Detail>
              <Detail label="Event">{incident.event}</Detail>
              <Detail label="Date">{incident.date}</Detail>
              <Detail label="Circuit">{incident.circuit}</Detail>
              <Detail label="Lap">{incident.lapNumber}</Detail>
              <Detail label="Corner / location">{incident.corner}</Detail>
              <Detail label="Category">{incident.category}</Detail>
              <Detail label="Difficulty">{incident.difficulty}</Detail>
            </div>
          </Section>

          {/* INCIDENT INFORMATION */}
          <Section
            number="02"
            title="Incident details"
            description="The recorded incident information."
          >
            <Detail label="Incident title">{incident.title}</Detail>

            <div className="rounded-lg border border-neutral-800 bg-[#11151b] p-5">
              <Detail label="Summary">
                <span className="whitespace-pre-wrap leading-7">
                  {incident.summary}
                </span>
              </Detail>
            </div>
          </Section>

          {/* DRIVERS */}
          <Section
            number="03"
            title="Involved drivers"
            description="The competitors identified in the official incident record."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <DriverCard
                label="Driver A"
                colour="bg-red-500"
                driver={incident.driverA}
              />

              <DriverCard
                label="Driver B"
                colour="bg-blue-500"
                driver={incident.driverB}
              />
            </div>
          </Section>

          {/* OFFICIAL DECISION */}
          <Section
            number="04"
            title="Official stewards' decision"
            description="The recorded official finding and penalty."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Detail label="Responsibility finding">
                {incident.officialDecision.responsibility}
              </Detail>

              <Detail label="Penalty">
                {incident.officialDecision.penalty}
              </Detail>

              <Detail label="Penalty details">
                {incident.officialDecision.penaltyDetails}
              </Detail>
            </div>

            <div className="rounded-lg border border-red-900/40 bg-[#211518] p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-red-400">
                Official explanation
              </p>

              <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-200">
                {incident.officialDecision.explanation || "No explanation recorded."}
              </p>
            </div>
          </Section>

          {/* SOURCES */}
          <Section
            number="05"
            title="Evidence sources"
            description="Supporting documents and references used to verify the incident."
          >
            {incident.sources.length > 0 ? (
              <div className="space-y-4">
                {incident.sources.map((source, index) => (
                  <div
                    key={`${source.url}-${index}`}
                    className="rounded-lg border border-neutral-800 bg-[#11151b] p-5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Source {index + 1}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {source.sourceType}
                      </span>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Detail label="Source title">{source.title}</Detail>
                      <Detail label="Publisher">{source.publisher}</Detail>
                      <Detail label="Date accessed">{source.accessedDate}</Detail>
                      <Detail label="Source link">
                        <ExternalLink
                          url={source.url}
                          title="Open source document"
                        />
                      </Detail>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                No sources recorded.
              </p>
            )}
          </Section>

          {/* VIDEO */}
          <Section
            number="06"
            title="Video reference"
            description="The video reference and its recorded permission status."
          >
            {incident.video ? (
              <div className="grid gap-6 sm:grid-cols-2">
                <Detail label="Provider">
                  {incident.video.provider}
                </Detail>

                <Detail label="Permission status">
                  {incident.video.permission}
                </Detail>

                <div className="sm:col-span-2">
                  <Detail label="Video link">
                    <ExternalLink
                      url={incident.video.url}
                      title="Open video reference"
                    />
                  </Detail>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">
                No video recorded.
              </p>
            )}
          </Section>

          {/* REVIEW AND PUBLICATION */}
          <section className="overflow-hidden rounded-xl border border-red-900/50 bg-[#181a1e]">
            <div className="border-b border-neutral-800 bg-[#211518] px-5 py-6 sm:px-7">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                Final review
              </p>

              <h2 className="text-2xl font-bold text-white">
                Verification and publication
              </h2>

              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Manage the evidence verification and publication status
                of this incident.
              </p>
            </div>

            <div className="p-5 sm:p-7">
              <AdminIncidentStatusControls
                incidentId={incident.id}
                evidenceStatus={incident.evidenceStatus}
                publicationStatus={incident.publicationStatus}
              />
            </div>
          </section>

        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-800 pt-7">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-5 py-3 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-900 hover:text-white"
          >
            ← Back to incident library
          </Link>

          <p className="text-xs text-neutral-600">
            APEX STEWARD · Incident management
          </p>
        </div>

      </div>
    </main>
  );
}


export default function AdminIncidentPage(props: AdminIncidentPageProps) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#101113] px-5 py-10 text-neutral-400">Loading incident...</main>}>
      <AdminIncidentContent {...props} />
    </Suspense>
  );
}
