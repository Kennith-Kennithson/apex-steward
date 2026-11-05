
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/admin-session";
import AdminQuizLauncher from "@/components/admin-quiz-launcher";

export default async function AdminQuizPage() {
  await connection();

  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#101113] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <a
          href="/admin"
          className="mb-8 inline-flex text-sm font-semibold text-neutral-400 transition hover:text-white"
        >
          ← Back to administration
        </a>

        <div className="mb-10 border-b border-neutral-800 pb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
            Private administrator testing
          </p>

          <h1 className="text-5xl font-black uppercase sm:text-6xl">
            TEST THE <span className="text-red-500">GRID.</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">
            Run a private examination using unpublished incidents from
            the database. Your test will not appear on the public
            leaderboard.
          </p>
        </div>

        <AdminQuizLauncher />
      </div>
    </main>
  );
}
