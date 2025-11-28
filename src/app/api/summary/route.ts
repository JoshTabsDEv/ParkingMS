import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/parking";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth(); // Must be authenticated to view summary
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to load dashboard summary", error);
    const message = error instanceof Error ? error.message : "Failed to load summary";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}

