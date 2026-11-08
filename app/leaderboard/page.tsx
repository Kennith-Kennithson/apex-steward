import Link from "next/link";
import { connection } from "next/server";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getLeaderboard } from "@/lib/leaderboard";

function formatLap(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds % 1000).padStart(3, "0")}`;
}

export default async function LeaderboardPage() {
  await connection();
  let entries = null;
  let unavailable = false;
  try {
    entries = await getLeaderboard(100);
  } catch {
    unavailable = true;
  }

  return <>
    <SiteHeader />
    <main className="min-h-[75vh] bg-[#101113] px-5 py-16 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-red-500">APEX STEWARD · WORLD CHAMPIONSHIP</p>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-6xl font-black uppercase sm:text-8xl">WORLD <span className="text-red-500">STANDINGS</span></h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-400">The global classification. Championship points decide the order, with fastest lap as the first tie-break and earliest submission deciding an exact tie.</p>

        <section className="mt-10 overflow-hidden rounded-xl border border-neutral-800 bg-[#181a1e]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 bg-[#202329] px-5 py-4">
            <div><p className="text-xs font-bold uppercase tracking-widest text-red-400">Official classification</p><p className="mt-1 text-sm text-neutral-400">Top 100 drivers</p></div>
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">APEX STEWARD GP</span>
          </div>
          {unavailable ? <div className="p-10 text-center text-sm text-neutral-400">The classification is temporarily unavailable. Please try again later.</div> : entries && entries.length > 0 ? <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-neutral-700 text-[11px] uppercase tracking-wider text-neutral-500">
                <tr><th className="px-5 py-4">Pos.</th><th className="px-5 py-4">Driver</th><th className="px-5 py-4 text-right">Championship points</th><th className="px-5 py-4 text-right">Fastest lap</th><th className="px-5 py-4">Classification</th></tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => <tr key={entry.id} className="border-b border-neutral-800 last:border-0 hover:bg-white/[0.025]">
                  <td className="px-5 py-4 font-[family-name:var(--font-barlow-condensed)] text-xl font-black text-neutral-400">{String(index + 1).padStart(2, "0")}</td>
                  <td className="px-5 py-4"><span className="mr-3 inline-block h-7 w-1 align-middle bg-red-600" /><span className="font-bold">{entry.callsign}</span></td>
                  <td className="px-5 py-4 text-right font-[family-name:var(--font-barlow-condensed)] text-xl font-black tabular-nums">{entry.championship_points}</td>
                  <td className="px-5 py-4 text-right font-mono text-sm tabular-nums">{formatLap(Number(entry.fastest_lap_ms))}</td>
                  <td className="px-5 py-4 text-xs text-neutral-400">{entry.grade}</td>
                </tr>)}
              </tbody>
            </table>
          </div> : <div className="p-10 text-center"><p className="font-bold">NO CLASSIFIED DRIVERS</p><p className="mt-2 text-sm text-neutral-500">Complete the examination and opt in to set the first time.</p></div>}
        </section>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-neutral-500">Only each driver's best result is shown.</p>
          <Link href="/quiz" className="rounded-md bg-red-600 px-5 py-3 text-xs font-black tracking-wider hover:bg-red-500">ENTER THE EXAMINATION →</Link>
        </div>
      </div>
    </main>
    <SiteFooter />
  </>;
}
