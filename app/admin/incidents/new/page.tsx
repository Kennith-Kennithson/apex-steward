
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-session";
import AdminIncidentForm from "@/components/admin-incident-form";

export default async function NewIncidentPage() {
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
