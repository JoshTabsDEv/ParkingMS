import { NextResponse } from "next/server";
import { createSession, listSessions } from "@/lib/parking";
import { sessionSchema } from "@/lib/validators";
import { requireAuth, requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth(); // Must be authenticated to view
    const sessions = await listSessions();
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch sessions", error);
    const message = error instanceof Error ? error.message : "Failed to fetch sessions";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(); // Only admins can create sessions
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
    let status = 500;
    if (message.includes("Unauthorized")) status = 401;
    else if (message.includes("Forbidden")) status = 403;
    else if (message.includes("not available")) status = 409;
    else if (message.includes("validation")) status = 400;
    return NextResponse.json({ message }, { status });
  }
}

