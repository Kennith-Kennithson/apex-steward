import { Suspense } from "react";
import { connection } from "next/server";

import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-session";
import AdminIncidentForm from "@/components/admin-incident-form";

async function NewIncidentContent() {
  await connection();
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
      <div>
        <Link
          href="/admin"
          className="text-sm text-neutral-400 hover:text-white"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold">
          Add a new incident
        </h1>

        <p className="mt-2 text-neutral-400">
          Add an incident to the APEX STEWARD library.
        </p>
      </div>

      <AdminIncidentForm />
    </main>
  );
}


export default function NewIncidentPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#101113] px-6 py-10 text-neutral-400">Loading incident form...</main>}>
      <NewIncidentContent />
    </Suspense>
  );
}
