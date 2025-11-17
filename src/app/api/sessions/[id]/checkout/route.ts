import { NextResponse } from "next/server";
import { checkoutSession } from "@/lib/parking";
import { checkoutSchema } from "@/lib/validators";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ message }, { status });
  }
}

