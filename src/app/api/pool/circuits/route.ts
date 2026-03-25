import { NextRequest, NextResponse } from "next/server";
import { setCircuitState } from "@/lib/intellicenter";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { circuitId, state } = body;

    if (typeof circuitId !== "string" || typeof state !== "boolean") {
      return NextResponse.json(
        { error: "circuitId (string) and state (boolean) are required" },
        { status: 400 }
      );
    }

    await setCircuitState(circuitId, state);
    return NextResponse.json({ success: true, circuitId, state });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set circuit state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
