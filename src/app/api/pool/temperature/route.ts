import { NextRequest, NextResponse } from "next/server";
import { setHeatMode, setSetPoint } from "@/lib/intellicenter";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bodyId, heatMode, setPoint } = body;

    if (typeof bodyId !== "string") {
      return NextResponse.json(
        { error: "bodyId (string, e.g. 'B1101') is required" },
        { status: 400 }
      );
    }

    if (heatMode !== undefined) {
      await setHeatMode(bodyId, String(heatMode));
    }

    if (setPoint !== undefined) {
      if (typeof setPoint !== "number" || setPoint < 40 || setPoint > 104) {
        return NextResponse.json(
          { error: "setPoint must be a number between 40 and 104" },
          { status: 400 }
        );
      }
      await setSetPoint(bodyId, setPoint);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update temperature";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
