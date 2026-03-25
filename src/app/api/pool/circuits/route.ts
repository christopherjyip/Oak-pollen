import { NextRequest, NextResponse } from "next/server";
import { setCircuitState } from "@/lib/screenlogic";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { circuitId, state } = body;

    if (typeof circuitId !== "number" || typeof state !== "boolean") {
      return NextResponse.json(
        { error: "circuitId (number) and state (boolean) are required" },
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
