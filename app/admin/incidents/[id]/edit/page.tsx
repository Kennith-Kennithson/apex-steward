import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import AdminIncidentForm from "@/components/admin-incident-form";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getAdminIncidentEditData } from "@/lib/google-sheets";

export default async function EditIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  const { id } = await params;
  const incident = await getAdminIncidentEditData(id);

  if (!incident) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#11151b] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <a
          href={`/admin/incidents/${encodeURIComponent(id)}`}
          className="mb-6 inline-flex text-sm font-semibold text-neutral-400 transition hover:text-white"
        >
          ← Back to incident review
        </a>

        <AdminIncidentForm initialData={incident} />
      </div>
    </main>
  );
}