import { NextResponse } from "next/server";
import { createSlot, listSlots } from "@/lib/parking";
import { slotSchema } from "@/lib/validators";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth(); // Must be authenticated to view
    const slots = await listSlots();
    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Failed to fetch slots", error);
    const message = error instanceof Error ? error.message : "Failed to fetch slots";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(); // Only admins can create slots
    const body = await request.json();
    const payload = slotSchema.parse(body);
    const slot = await createSlot(payload);
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error("Failed to create slot", error);
    const message =
      error instanceof Error ? error.message : "Failed to create slot";
    let status = 500;
    if (message.includes("Unauthorized")) status = 401;
    else if (message.includes("Forbidden")) status = 403;
    else if (message.includes("exists")) status = 409;
    else if (message.includes("validation")) status = 400;
    return NextResponse.json({ message }, { status });
  }
}

