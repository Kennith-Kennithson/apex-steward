"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminIncidentStatusControlsProps {
  incidentId: string;
  evidenceStatus: string;
  publicationStatus: string;
}

export default function AdminIncidentStatusControls({
  incidentId,
  evidenceStatus,
  publicationStatus,
}: AdminIncidentStatusControlsProps) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function updateStatus(
    statusType: "evidence" | "publication",
    newStatus: string
  ) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/admin/incidents/${encodeURIComponent(incidentId)}/status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statusType, newStatus }),
        }
      );

      const result: { success?: boolean; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update status.");
      }

      setMessage("Status updated successfully.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setBusy(false);
    }
  }

  const buttonClass =
    "rounded-md border border-neutral-700 px-4 py-3 text-sm font-semibold transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-neutral-300">
          Evidence review
        </h3>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || evidenceStatus === "draft"}
            onClick={() => updateStatus("evidence", "draft")}
            className={buttonClass}
          >
            Return to Draft
          </button>

          <button
            type="button"
            disabled={busy || evidenceStatus === "under-review"}
            onClick={() => updateStatus("evidence", "under-review")}
            className={buttonClass}
          >
            Mark Under Review
          </button>

          <button
            type="button"
            disabled={busy || evidenceStatus === "verified"}
            onClick={() => updateStatus("evidence", "verified")}
            className={`${buttonClass} border-green-800 text-green-400`}
          >
            Verify Evidence
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-300">
          Publication
        </h3>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || publicationStatus === "unpublished"}
            onClick={() => updateStatus("publication", "unpublished")}
            className={buttonClass}
          >
            Unpublish Incident
          </button>

          <button
            type="button"
            disabled={
              busy ||
              publicationStatus === "published" ||
              evidenceStatus !== "verified"
            }
            onClick={() => updateStatus("publication", "published")}
            className={`${buttonClass} border-red-800 text-red-400`}
          >
            Publish Incident
          </button>
        </div>

        {evidenceStatus !== "verified" && (
          <p className="mt-3 text-xs text-yellow-400">
            Evidence must be verified before this incident can be published.
          </p>
        )}
      </div>

      {busy && (
        <p className="text-sm text-neutral-400">Updating incident...</p>
      )}

      {message && (
        <p role="status" className="text-sm text-green-400">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}