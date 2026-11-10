
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Incident } from "@/lib/incidents/types";

type AdminIncidentFormData = Incident & {
  publicationStatus: string;
  driverAId: string;
  driverBId: string;
  sourceIds: string[];
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#11151b] px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-red-500 focus:ring-1 focus:ring-red-500";

const labelClass =
  "mb-2 block text-sm font-semibold text-neutral-300";

const sectionClass =
  "overflow-hidden rounded-xl border border-white/10 bg-[#191e26]";

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-white/10 bg-white/[0.02] px-5 py-5 sm:px-7">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/15 text-sm font-bold text-red-400">
        {number}
      </span>
      <div>
        <h3 className="text-base font-bold tracking-wide text-white">
          {title}
        </h3>
        <p className="mt-1 text-sm text-neutral-400">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminIncidentForm({
  initialData,
}: {
  initialData?: AdminIncidentFormData;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  useEffect(() => {
    if (!initialData || !formRef.current) return;

    const source = initialData.sources[0];

    const values: Record<string, string> = {
      series: initialData.series,
      season: String(initialData.season),
      event: initialData.event,
      date: initialData.date,
      circuit: initialData.circuit ?? "",
      lapNumber: initialData.lapNumber
        ? String(initialData.lapNumber)
        : "",
      corner: initialData.corner ?? "",
      title: initialData.title,
      category: initialData.category,
      difficulty: initialData.difficulty,
      summary: initialData.summary ?? "",

      driverAName: initialData.driverA.name,
      driverACarNumber: initialData.driverA.carNumber ?? "",
      driverATeam: initialData.driverA.team ?? "",
      driverAColor: initialData.driverA.carColor ?? "",

      driverBName: initialData.driverB.name,
      driverBCarNumber: initialData.driverB.carNumber ?? "",
      driverBTeam: initialData.driverB.team ?? "",
      driverBColor: initialData.driverB.carColor ?? "",

      responsibility: initialData.officialDecision.responsibility,
      penalty: initialData.officialDecision.penalty,
      penaltyDetails: initialData.officialDecision.penaltyDetails ?? "",
      explanation: initialData.officialDecision.explanation,

      sourceTitle: source?.title ?? "",
      sourcePublisher: source?.publisher ?? "",
      sourceUrl: source?.url ?? "",
      sourceType: source?.sourceType ?? "official-document",
      sourceAccessedDate: source?.accessedDate ?? "",

      videoUrl: initialData.video?.url ?? "",
      videoProvider: initialData.video?.provider ?? "",
      videoPermission: initialData.video?.permission ?? "not-cleared",
    };

    for (const [name, value] of Object.entries(values)) {
      const field = formRef.current.elements.namedItem(name) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;

      if (field) field.value = value;
    }

    const permanentlyMutedCheckbox = formRef.current.elements.namedItem(
      "permanentlyMuted"
    ) as HTMLInputElement | null;
    if (permanentlyMutedCheckbox) {
      permanentlyMutedCheckbox.checked =
        initialData.video?.permanentlyMuted === true;
    }
  }, [initialData]);
  
  async function handleVideoUpload(file: File) {
    setError("");
    setMessage("");
    setUploadMessage("");
    setUploadProgress(0);

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedTypes.includes(file.type)) {
      setError("Choose an MP4, WebM or QuickTime video.");
      return;
    }
    if (file.size <= 0 || file.size > 250 * 1024 * 1024) {
      setError("Video must be smaller than 250 MB.");
      return;
    }

    setUploading(true);
    try {
      const signResponse = await fetch("/api/admin/r2-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });
      const signed = await signResponse.json();
      if (!signResponse.ok) {
        throw new Error(signed.error ?? "Unable to prepare the video upload.");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error("Cloudflare rejected the video upload. Check the bucket CORS settings and try again."));
        };
        xhr.onerror = () => reject(new Error("Video upload failed. Check your connection and bucket CORS settings."));
        xhr.onabort = () => reject(new Error("Video upload was cancelled."));
        xhr.send(file);
      });

      const videoUrlField = formRef.current?.elements.namedItem("videoUrl") as HTMLInputElement | null;
      const providerField = formRef.current?.elements.namedItem("videoProvider") as HTMLInputElement | null;
      if (videoUrlField) videoUrlField.value = signed.publicUrl;
      if (providerField) providerField.value = "Cloudflare R2";
      setUploadProgress(100);
      setUploadMessage("Upload complete. The video URL has been added to this incident. Save the incident to keep the reference.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;

    setSaving(true);
    setMessage("");
    setError("");

    const form = new FormData(formElement);
    const value = (name: string) => String(form.get(name) ?? "").trim();

    const payload = {
      series: value("series"),
      season: Number(value("season")),
      event: value("event"),
      date: value("date"),
      circuit: value("circuit"),
      lapNumber: value("lapNumber") ? Number(value("lapNumber")) : undefined,
      corner: value("corner"),
      category: value("category"),
      difficulty: value("difficulty"),

      driverA: {
        name: value("driverAName"),
        carNumber: value("driverACarNumber"),
        team: value("driverATeam"),
        carColor: value("driverAColor"),
      },

      driverB: {
        name: value("driverBName"),
        carNumber: value("driverBCarNumber"),
        team: value("driverBTeam"),
        carColor: value("driverBColor"),
      },

      title: value("title"),
      summary: value("summary"),

      officialDecision: {
        responsibility: value("responsibility"),
        penalty: value("penalty"),
        penaltyDetails: value("penaltyDetails"),
        explanation: value("explanation"),
      },

      sources: [
        {
          title: value("sourceTitle"),
          publisher: value("sourcePublisher"),
          url: value("sourceUrl"),
          sourceType: value("sourceType"),
          accessedDate: value("sourceAccessedDate"),
        },
      ],

      video: value("videoUrl")
        ? {
            url: value("videoUrl"),
            provider: value("videoProvider"),
            permission: value("videoPermission"),
            permanentlyMuted: form.get("permanentlyMuted") === "on",
          }
        : undefined,
    };

       try {
      const response = await fetch(
        initialData
          ? `/api/admin/incidents/${initialData.id}`
          : "/api/admin/incidents",
        {
          method: initialData ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save the incident.");
      }

      setMessage(
        initialData
          ? "Incident updated successfully."
          : `Incident saved successfully. ID: ${result.incidentId}`
      );

      if (!initialData) {
        formElement.reset();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
        <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-7 text-white"
    >
      <div className="rounded-xl border border-red-500/20 bg-gradient-to-r from-red-950/40 to-[#191e26] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
              APEX STEWARD / INCIDENT DATABASE
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
                           {initialData ? "Edit incident" : "New incident"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">
              Enter the event details, drivers and official stewards&apos;
              decision. New incidents are automatically saved as drafts.
            </p>
          </div>
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-semibold text-yellow-400">
                        {initialData
              ? `${initialData.evidenceStatus.toUpperCase()} / ${initialData.publicationStatus.toUpperCase()}`
              : "DRAFT / UNPUBLISHED"}
          </span>
        </div>
      </div>

      <section className={sectionClass}>
        <SectionHeading
          number="01"
          title="Event details"
          description="Identify the race and where the incident occurred."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <Field label="Motorsport series">
            <select name="series" className={inputClass} required defaultValue="F1">
              <option value="F1">Formula 1</option>
              <option value="WEC">World Endurance Championship</option>
              <option value="IndyCar">IndyCar</option>
              <option value="NASCAR">NASCAR</option>
              <option value="MotoGP">MotoGP</option>
            </select>
          </Field>

          <Field label="Season">
            <input name="season" type="number" min="1950" max="2100" className={inputClass} required placeholder="e.g. 2026" />
          </Field>

          <Field label="Event name">
            <input name="event" className={inputClass} placeholder="e.g. Mexico City Grand Prix" maxLength={150} required />
          </Field>

          <Field label="Event date">
            <input name="date" type="date" className={inputClass} required />
          </Field>

          <Field label="Circuit">
            <input name="circuit" className={inputClass} placeholder="e.g. Autódromo Hermanos Rodríguez" maxLength={150} required />
          </Field>

          <Field label="Lap number (optional)">
            <input name="lapNumber" type="number" min="1" max="1000" className={inputClass} placeholder="e.g. 15" />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Corner or location">
              <input name="corner" className={inputClass} placeholder="e.g. Turn 2" maxLength={100} required />
            </Field>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading
          number="02"
          title="Incident details"
          description="Describe and classify the incident for the quiz library."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <div className="sm:col-span-2">
            <Field label="Incident title">
              <input name="title" className={inputClass} placeholder="A short internal title" maxLength={200} required />
            </Field>
          </div>

          <Field label="Category">
            <select name="category" className={inputClass} required>
              <option value="collision">Collision</option>
              <option value="overtaking">Overtaking</option>
              <option value="track-limits">Track limits</option>
              <option value="defending">Defending</option>
              <option value="unsafe-release">Unsafe release</option>
              <option value="pit-lane">Pit lane</option>
              <option value="safety-car">Safety car</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Difficulty">
            <select name="difficulty" className={inputClass} required>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Internal summary (optional)">
              <textarea name="summary" className={inputClass} rows={3} maxLength={1000} placeholder="Optional notes for the incident record..." />
            </Field>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading
          number="03"
          title="Involved drivers"
          description="Enter the two drivers involved in the incident."
        />
        <div className="grid divide-y divide-white/10 md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="space-y-5 p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-sm font-bold">A</span>
              <div>
                <h4 className="font-bold">Driver A</h4>
                <p className="text-xs text-neutral-500">First involved driver</p>
              </div>
            </div>
            <Field label="Driver name">
              <input name="driverAName" className={inputClass} required maxLength={100} placeholder="Full name" />
            </Field>
            <Field label="Car number">
              <input name="driverACarNumber" className={inputClass} maxLength={10} placeholder="e.g. 81" />
            </Field>
            <Field label="Team">
              <input name="driverATeam" className={inputClass} maxLength={100} placeholder="Team name" />
            </Field>
            <Field label="Car colour">
              <input name="driverAColor" className={inputClass} maxLength={50} placeholder="e.g. Papaya orange" />
            </Field>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">B</span>
              <div>
                <h4 className="font-bold">Driver B</h4>
                <p className="text-xs text-neutral-500">Second involved driver</p>
              </div>
            </div>
            <Field label="Driver name">
              <input name="driverBName" className={inputClass} required maxLength={100} placeholder="Full name" />
            </Field>
            <Field label="Car number">
              <input name="driverBCarNumber" className={inputClass} maxLength={10} placeholder="e.g. 41" />
            </Field>
            <Field label="Team">
              <input name="driverBTeam" className={inputClass} maxLength={100} placeholder="Team name" />
            </Field>
            <Field label="Car colour">
              <input name="driverBColor" className={inputClass} maxLength={50} placeholder="e.g. Racing Bulls blue" />
            </Field>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading
          number="04"
          title="Official stewards' decision"
          description="Record the actual official finding and detailed penalty. The public quiz automatically maps this to its simpler three-outcome question."
        />
        <div className="space-y-5 p-5 sm:p-7">
          <Field label="Responsibility finding">
            <select name="responsibility" className={inputClass} required>
              <option value="driver-a">Driver A</option>
              <option value="driver-b">Driver B</option>
              <option value="racing-incident">Racing incident</option>
            </select>
          </Field>
          <p className="text-xs leading-relaxed text-neutral-400">
            Every responsibility finding is scored. A correct Driver A, Driver B, or Racing incident answer earns 15 points; the outcome is worth another 10. Every incident is worth 25 points maximum.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Official penalty (full record)">
              <select name="penalty" className={inputClass} required>
                <option value="no-further-action">No further action</option>
                <option value="warning">Warning</option>
                <option value="reprimand">Reprimand</option>
                <option value="time-penalty">Time penalty</option>
                <option value="drive-through">Drive-through penalty</option>
                <option value="stop-and-go">Stop-and-go penalty</option>
                <option value="grid-penalty">Grid penalty</option>
                <option value="championship-points">Championship points penalty</option>
                <option value="disqualification">Disqualification</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Penalty details (optional)">
              <input name="penaltyDetails" className={inputClass} placeholder="e.g. 10 seconds" maxLength={200} />
            </Field>
          </div>

          <p className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-xs leading-relaxed text-blue-200/80">
            Public quiz outcome mapping: <strong>No further action</strong> becomes “No penalty / no further action”; <strong>Disqualification</strong> becomes “Disqualified”; every other official penalty type becomes “Penalty”. The full official penalty and details remain stored here for historical accuracy.
          </p>

          <Field label="Official explanation">
            <textarea name="explanation" className={inputClass} rows={5} maxLength={2000} required placeholder="Summarise the official stewards' reasoning..." />
          </Field>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading
          number="05"
          title="Evidence source"
          description="Provide at least one source supporting the official decision."
        />
        <div className="space-y-5 p-5 sm:p-7">
          <Field label="Source title">
            <input name="sourceTitle" className={inputClass} placeholder="e.g. FIA Stewards Decision" maxLength={200} required />
          </Field>

          <Field label="Publisher">
            <input name="sourcePublisher" className={inputClass} placeholder="e.g. FIA" maxLength={100} required />
          </Field>

          <Field label="Source URL">
            <input name="sourceUrl" type="url" className={inputClass} placeholder="https://..." maxLength={2048} required />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Source type">
              <select name="sourceType" className={inputClass} required>
                <option value="official-document">Official document</option>
                <option value="official-regulations">Official regulations</option>
                <option value="official-video">Official video</option>
                <option value="reputable-report">Reputable report</option>
              </select>
            </Field>

            <Field label="Date accessed">
              <input name="sourceAccessedDate" type="date" className={inputClass} required />
            </Field>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading
          number="06"
          title="Video reference"
          description="Optional footage reference for the incident."
        />
        <div className="space-y-5 p-5 sm:p-7">
          <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <label className={labelClass} htmlFor="incident-video-upload">Upload video to Cloudflare R2</label>
            <input
              id="incident-video-upload"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              disabled={uploading || saving}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void handleVideoUpload(file);
                event.currentTarget.value = "";
              }}
              className="block w-full text-sm text-neutral-300 file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-red-500 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-neutral-500">MP4, WebM or MOV · maximum 250 MB. Uploading makes the video publicly viewable by anyone with its URL.</p>
            {uploading && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="mt-1 text-xs text-neutral-400">Uploading video: {uploadProgress}%</p>
              </div>
            )}
            {uploadMessage && <p role="status" className="mt-3 text-sm text-green-400">{uploadMessage}</p>}
          </div>

          <Field label="Video URL">
            <input name="videoUrl" type="url" className={inputClass} placeholder="https://..." maxLength={2048} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Video provider">
              <input name="videoProvider" className={inputClass} placeholder="e.g. YouTube" maxLength={100} />
            </Field>

            <Field label="Video permission status">
              <select name="videoPermission" className={inputClass} defaultValue="not-cleared">
                <option value="not-cleared">Not cleared</option>
                <option value="official-embed">Official embed</option>
                <option value="licensed">Licensed</option>
                <option value="permission-granted">Permission granted</option>
              </select>
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-neutral-300">
            <input type="checkbox" name="permanentlyMuted" className="mt-0.5 h-4 w-4 accent-red-600" />
            <span>
              <span className="block font-semibold text-white">Permanently mute this incident</span>
              <span className="mt-1 block text-xs leading-relaxed text-neutral-500">Players will not be able to turn the audio on for this video.</span>
            </span>
          </label>

          <p className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs leading-relaxed text-yellow-300/80">
            Adding a video URL does not mean permission has been granted. Leave the URL blank if you do not have one.
          </p>
        </div>
      </section>

      {message && (
        <p role="status" className="break-all rounded-lg border border-green-700/50 bg-green-950/30 p-4 text-sm text-green-400">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-700/50 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#191e26] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-semibold text-white">Ready to save?</p>
          <p className="mt-1 text-xs text-neutral-400">
                        {initialData
              ? "Changes will be saved to this existing incident."
              : "The incident will be saved as a draft for review."}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-red-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
                    {saving
            ? "Saving incident..."
            : initialData
              ? "Save changes →"
              : "Save incident as draft →"}
        </button>
      </div>
    </form>
  );
}
