
import { NextResponse } from "next/server";
import { endAdminSession } from "@/lib/admin-session";

export async function POST() {
  try {
    await endAdminSession();

    return NextResponse.json(
      { success: true },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to log out." },
      { status: 500 },
    );
  }
}
