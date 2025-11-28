import { NextResponse } from "next/server";
import { checkoutSession } from "@/lib/parking";
import { checkoutSchema } from "@/lib/validators";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(); // Only admins can checkout sessions
    const { id } = await context.params;
    const sessionId = Number(id);
    if (Number.isNaN(sessionId)) {
      return NextResponse.json(
        { message: "Invalid session id" },
        { status: 400 }
      );
    }
    const body = (await request.json().catch(() => ({}))) ?? {};
    const payload = checkoutSchema.parse(body);
    const summary = await checkoutSession(sessionId, payload);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to checkout session", error);
    const message =
      error instanceof Error ? error.message : "Failed to checkout session";
    let status = 500;
    if (message.includes("Unauthorized")) status = 401;
    else if (message.includes("Forbidden")) status = 403;
    else if (message.includes("not found")) status = 404;
    else if (message.includes("validation")) status = 400;
    return NextResponse.json({ message }, { status });
  }
}

