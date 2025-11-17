import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/parking";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to load dashboard summary", error);
    return NextResponse.json(
      { message: "Failed to load summary" },
      { status: 500 }
    );
  }
}

