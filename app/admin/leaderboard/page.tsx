import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { getLeaderboard } from "@/lib/leaderboard";
import AdminLeaderboardTable from "@/components/admin-leaderboard-table";

async function AdminLeaderboardContent() {
  await connection();
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const entries = await getLeaderboard(100);

  return <main className="min-h-screen bg-[#101113] px-5 py-12 text-white sm:px-8">
    <div className="mx-auto max-w-7xl">
      <Link href="/admin" className="mb-8 inline-flex text-sm font-semibold text-neutral-400 hover:text-white">← Back to administration</Link>
      <header className="mb-10 border-b border-neutral-800 pb-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-red-500">Private administration</p>
        <h1 className="text-5xl font-black uppercase">LEADERBOARD <span className="text-red-500">CONTROL</span></h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-400">Review public callsigns and remove offensive or inappropriate leaderboard entries. Deletion is permanent.</p>
      </header>
      <section className="rounded-xl border border-neutral-800 bg-[#181a1e] p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-4"><h2 className="text-xl font-bold">Global classification</h2><span className="text-xs text-neutral-500">{entries.length} SHOWN · MAXIMUM 100</span></div>
        <AdminLeaderboardTable initialEntries={entries} />
      </section>
    </div>
  </main>;
}

export default function AdminLeaderboardPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#101113] p-10 text-neutral-400">Loading leaderboard administration...</main>}><AdminLeaderboardContent /></Suspense>;
}
