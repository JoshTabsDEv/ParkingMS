import { NextResponse } from "next/server";
import { createSlot, listSlots } from "@/lib/parking";
import { slotSchema } from "@/lib/validators";

export async function GET() {
  try {
    const slots = await listSlots();
    return NextResponse.json({ slots });
  } catch (error) {
    console.error("Failed to fetch slots", error);
    return NextResponse.json(
      { message: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = slotSchema.parse(body);
    const slot = await createSlot(payload);
    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error("Failed to create slot", error);
    const message =
      error instanceof Error ? error.message : "Failed to create slot";
    const status = message.includes("exists") ? 409 : 400;
    return NextResponse.json({ message }, { status });
  }
}

