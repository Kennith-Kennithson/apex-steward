import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { deleteLeaderboardEntry } from "@/lib/leaderboard";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Administrator authentication required." }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    await deleteLeaderboardEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leaderboard entry deletion failed:", error);
    return NextResponse.json({ error: "Unable to delete this leaderboard entry." }, { status: 400 });
  }
}
