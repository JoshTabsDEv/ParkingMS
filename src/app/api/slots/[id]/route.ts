import { NextResponse } from "next/server";
import { z } from "zod";
import { markSlotStatus } from "@/lib/parking";

const updateSchema = z.object({
  status: z.enum(["available", "occupied", "maintenance"]),
});

interface Params {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const body = await request.json();
    const payload = updateSchema.parse(body);
    const slotId = Number(params.id);
    if (Number.isNaN(slotId)) {
      return NextResponse.json({ message: "Invalid slot id" }, { status: 400 });
    }
    await markSlotStatus(slotId, payload.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update slot", error);
    const message =
      error instanceof Error ? error.message : "Failed to update slot";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}

