import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/parking";
import { sessionSchema } from "@/lib/validators";

export async function GET() {
  try {
    const sessions = await listSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions", error);
    return NextResponse.json(
      { message: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = sessionSchema.parse(body);
    const session = await createSession({
      slotId: payload.slotId,
      vehiclePlate: payload.vehiclePlate,
      vehicleType: payload.vehicleType,
      driverName: payload.driverName,
    });
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Failed to register vehicle", error);
    const message =
      error instanceof Error ? error.message : "Failed to register vehicle";
    const status = message.includes("not available") ? 409 : 400;
    return NextResponse.json({ message }, { status });
  }
}

