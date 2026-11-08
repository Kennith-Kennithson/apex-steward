import { NextResponse, connection } from "next/server";
import { getLeaderboard } from "@/lib/leaderboard";

export async function GET() {
  try {
    await connection();
    const entries = await getLeaderboard(100);
    return NextResponse.json({
      entries: entries.map((entry, index) => ({
        position: index + 1,
        id: entry.id,
        callsign: entry.callsign,
        championshipPoints: entry.championship_points,
        maximumPoints: entry.maximum_points,
        percentage: Number(entry.percentage),
        grade: entry.grade,
        fastestLapMs: Number(entry.fastest_lap_ms),
      })),
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Leaderboard fetch failed:", error);
    return NextResponse.json({ error: "The leaderboard is temporarily unavailable." }, { status: 503 });
  }
}
